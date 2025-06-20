import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

declare module "express-session" {
  interface SessionData {
    biometricChallenge?: string;
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET not set, using a random value");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: app.get("env") === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // First try to find admin user by email
        const user = await storage.getUserByEmail(email);
        if (user && (await comparePasswords(password, user.password))) {
          return done(null, { ...user, userType: 'admin' });
        }
        
        // Then try to find player by email
        const players = await storage.getPlayers();
        const player = players.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
        if (player && player.password && (await comparePasswords(password, player.password))) {
          return done(null, { ...player, userType: 'player' });
        }
        
        return done(null, false);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      // First try to find admin user
      const user = await storage.getUser(id);
      if (user) {
        return done(null, { ...user, userType: 'admin' });
      }
      
      // Then try to find player
      const player = await storage.getPlayer(id);
      if (player) {
        return done(null, { ...player, userType: 'player' });
      }
      
      done(null, null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Send welcome email automatically
      try {
        const { getResendEmailService } = await import('./resend-email-service');
        const resendService = getResendEmailService();
        if (resendService && user.email) {
          await resendService.sendWelcome(user.email, {
            playerName: user.name || user.username,
            username: user.username,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth`,
            supportEmail: 'support@wynnrz.com'
          });
          console.log(`📧 Welcome email sent to new user: ${user.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't return the password hash in the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't return the password hash in the response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("🔐 User request debug:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id,
      isAdmin: req.user?.isAdmin,
      is_app_admin: (req.user as any)?.is_app_admin,
      userType: (req.user as any)?.userType,
      fullUser: req.user
    });
    
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't return the password hash in the response
    if (req.user) {
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } else {
      res.sendStatus(401);
    }
  });

  // Password reset request (both routes for compatibility)
  const handlePasswordResetRequest = async (req: Express.Request, res: Express.Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false
      });

      // Send password reset email
      try {
        const { getResendEmailService } = await import('./resend-email-service');
        const resendService = getResendEmailService();
        if (resendService) {
          const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
          await resendService.sendPasswordReset(email, {
            playerName: user.name || user.username,
            resetLink,
            expirationTime: '1 hour',
            ipAddress: req.ip || req.connection.remoteAddress
          });
          console.log(`📧 Password reset email sent to: ${email}`);
        }
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (err) {
      console.error('Password reset request error:', err);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Set up both routes for compatibility
  app.post("/api/auth/request-password-reset", handlePasswordResetRequest);
  app.post("/api/forgot-password", handlePasswordResetRequest);

  // Password reset confirmation
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      console.log(`🔐 Password reset successful for user: ${resetToken.userId}`);
      res.json({ message: "Password reset successful" });
    } catch (err) {
      console.error('Password reset error:', err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

export function isAuthenticated(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export function isAdmin(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated() && req.user && req.user.isAppAdmin) {
    return next();
  }
  res.status(403).json({ message: "Access denied. App administrator privileges required." });
}

export function isAppAdmin(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated() && req.user && req.user.isAppAdmin) {
    return next();
  }
  res.status(403).json({ message: "Access denied. App administrator privileges required." });
}

export function hasActiveSubscription(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  // Admin users bypass subscription checks
  if (user.isAdmin || user.isAppAdmin) {
    return next();
  }

  // Check subscription status
  const subscriptionStatus = user.subscriptionStatus || 'free_trial';
  const subscriptionValidUntil = user.subscriptionValidUntil;
  
  // Check if subscription is expired
  const now = new Date();
  const validUntil = subscriptionValidUntil ? new Date(subscriptionValidUntil) : null;
  const isExpired = validUntil ? now > validUntil : false;

  if (subscriptionStatus === 'expired' || isExpired) {
    return res.status(403).json({ 
      message: "Active subscription required", 
      code: "SUBSCRIPTION_EXPIRED",
      subscriptionStatus: isExpired ? 'expired' : subscriptionStatus
    });
  }

  next();
}
