import type { Express } from "express";
import { createServer, type Server } from "http";
import { pool } from "./db";
import { randomUUID } from "crypto";
import crypto from "crypto";
import { Pool } from "@neondatabase/serverless";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isAppAdmin, hasActiveSubscription } from "./auth";
import { insertTournamentSchema, insertPlayerSchema, insertTeamSchema, insertGameSchema, insertGameParticipantSchema, insertLeaderboardFormulaSchema, users, games, gameParticipants, tournaments, players, teams } from "@shared/schema";
import { createCheckoutSession, PRICING_PLANS } from "./stripe";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
import { db } from './db';
import { sql, eq, and, gte, desc, count, avg } from "drizzle-orm";
import { z } from "zod";
import { socialService } from "./social-service";
import { nanoid } from "nanoid";
import { getResendEmailService } from "./resend-email-service";
import { captureLeaderboardSnapshot, getMovementData } from "./leaderboard-movement";
import { distributeTeamPointsToPlayers } from "./team-point-distribution";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Initialize email service
  const emailService = getResendEmailService();

  // Test email endpoint (placed early to ensure proper routing)
  app.post("/api/emails/test", async (req, res) => {
    try {
      const { getResendEmailService } = await import('./resend-email-service');
      const { getFallbackEmailService } = await import('./fallback-email-service');
      
      const { to } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      console.log("📧 Sending test email to:", to);
      
      // Try Resend HTTP API first (bypasses SMTP domain issues)
      const resendService = getResendEmailService();
      if (resendService) {
        console.log("📧 Using Resend HTTP API service");
        const success = await resendService.sendTestEmail(to);
        if (success) {
          return res.json({ 
            message: "Test email sent successfully via Resend API", 
            service: "resend"
          });
        }
        console.log("❌ Resend service failed, falling back");
      } else {
        console.log("❌ Resend service not available");
      }

      // Fallback to logging
      const fallbackService = getFallbackEmailService();
      const fallbackSuccess = await fallbackService.sendTestEmail(to);
      
      if (fallbackSuccess) {
        res.json({ 
          message: "Email queued for sending (RESEND_API_KEY needed for delivery)", 
          service: "fallback"
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send test email", 
          service: "fallback"
        });
      }
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const activeTournaments = await storage.getActiveTournamentsCount();
      const totalGames = await storage.getTotalGamesCount();
      const totalPlayers = await storage.getTotalPlayersCount();
      
      console.log("📊 Stats collected:", { activeTournaments, totalGames, totalPlayers });
      
      res.json({
        activeTournaments,
        gamesRecorded: totalGames,
        registeredPlayers: totalPlayers,
        totalPlayers: totalPlayers
      });
    } catch (error) {
      console.error("❌ Stats API error:", error);
      res.status(500).json({ message: "Failed to get stats: " + (error as Error).message });
    }
  });

  // Feedback summary for app admin
  app.get("/api/feedback/summary", isAuthenticated, async (req, res) => {
    try {
      const allFeedback = await storage.getAllFeedback();
      const tournaments = await storage.getTournaments();
      
      // Group feedback by tournament
      const feedbackByTournament = allFeedback.reduce((acc, feedback) => {
        if (!acc[feedback.tournament_id]) {
          acc[feedback.tournament_id] = {
            count: 0,
            pending: 0,
            resolved: 0,
            recent: []
          };
        }
        acc[feedback.tournament_id].count++;
        // For our simplified feedback, treat all as pending
        acc[feedback.tournament_id].pending++;
        
        // Add to recent items (limit to 3)
        if (acc[feedback.tournament_id].recent.length < 3) {
          acc[feedback.tournament_id].recent.push({
            id: feedback.id,
            message: feedback.message,
            category: feedback.category,
            createdAt: feedback.created_at
          });
        }
        
        return acc;
      }, {} as any);

      // Add tournament names
      const summary = tournaments.map(tournament => ({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        totalFeedback: feedbackByTournament[tournament.id]?.count || 0,
        pendingFeedback: feedbackByTournament[tournament.id]?.pending || 0,
        resolvedFeedback: feedbackByTournament[tournament.id]?.resolved || 0,
        recentFeedback: feedbackByTournament[tournament.id]?.recent || []
      })).filter(t => t.totalFeedback > 0);

      res.json(summary);
    } catch (error) {
      console.error("❌ Failed to get feedback summary:", error);
      res.status(500).json({ message: "Failed to get feedback summary" });
    }
  });

  // Tournament routes
  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getTournaments();
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tournaments" });
    }
  });

  // Get tournaments where the authenticated user is a participant
  app.get("/api/my-tournaments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log("📊 Getting tournaments for user:", userId);
      const userTournaments = await storage.getUserTournaments(userId);
      console.log("📊 Found tournaments:", userTournaments.length);
      res.json(userTournaments);
    } catch (error) {
      console.error("❌ Error fetching user tournaments:", error);
      res.status(400).json({ message: "Failed to get user tournaments", error: error.message });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const id = req.params.id; // Keep as string for UUID
      const tournament = await storage.getTournament(id);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tournament" });
    }
  });

  app.post("/api/tournaments", isAuthenticated, async (req, res) => {
    try {
      console.log("Received tournament data:", req.body);
      
      // Manual validation and transformation for dates
      const { startDate, endDate, ...restData } = req.body;
      
      // Format the data correctly
      const tournamentData = {
        id: crypto.randomUUID(),
        ...restData,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: req.user?.id
      };
      
      console.log("Processed tournament data:", tournamentData);
      
      // Create the tournament
      const createdTournament = await storage.createTournament(tournamentData);
      
      // Get the current user ID
      const currentUserId = req.user?.id;
      
      // First see if this user already has a player record
      // We need to look up the player directly or by user's information
      let playerForCreator = null;
      const players = await storage.getPlayers();
      
      // Look for players with the same email or created by this user
      for (const player of players) {
        if (player.email === req.user?.email) {
          playerForCreator = player;
          break;
        }
      }
      
      // If no player record was found, create one or find by username
      if (!playerForCreator) {
        // Try to find by username first
        playerForCreator = players.find(p => p.name === req.user?.username);
        
        if (!playerForCreator) {
          // Create a new player record for this user
          playerForCreator = await storage.createPlayer({
            name: req.user?.username || req.user?.name || 'Tournament Creator',
            email: req.user?.email || null,
            contact: null
          });
          console.log("Created new player record for tournament creator:", playerForCreator);
        }
      }
      
      // Add the creator as the first player with admin rights
      await storage.addPlayerToTournament({
        tournamentId: createdTournament.id,
        playerId: playerForCreator.id,
        isAdministrator: true,  // Make them an admin
        canRecordResults: true, // Allow them to record results
        canManageFormulas: true // Allow them to manage formulas
      });
      
      console.log("Added creator as admin player to tournament:", playerForCreator.name);
      
      // Return tournament with administrator info
      res.status(201).json({
        ...createdTournament,
        administratorAssigned: true,
        administratorName: playerForCreator.name,
        message: "Tournament created successfully. You are now the tournament administrator with full management permissions."
      });
    } catch (error) {
      console.error("Tournament creation error:", error);
      
      // Check if tournament was created but player assignment failed
      if (createdTournament) {
        return res.status(201).json({
          ...createdTournament,
          administratorAssigned: false,
          message: "Tournament created successfully, but there was an issue assigning administrator privileges. Please contact support to complete the setup."
        });
      }
      
      // Handle validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid tournament data. Please check your entries and try again.",
          errors: error.errors 
        });
      }
      
      // Handle different types of errors with user-friendly messages
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("duplicate key") || errorMessage.includes("already exists")) {
        return res.status(409).json({ 
          message: "A tournament with this name already exists. Please choose a different name." 
        });
      }
      
      if (errorMessage.includes("database") || errorMessage.includes("connection")) {
        return res.status(503).json({ 
          message: "Database temporarily unavailable. Please try again in a few moments." 
        });
      }
      
      res.status(500).json({ 
        message: "Unable to create tournament at this time. Please try again or contact support if the problem persists." 
      });
    }
  });

  app.put("/api/tournaments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Use string ID for UUID
      const tournament = insertTournamentSchema.partial().parse(req.body);
      const updatedTournament = await storage.updateTournament(id, tournament);
      
      if (!updatedTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json(updatedTournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  app.patch("/api/tournaments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Use string ID for UUID
      const tournament = insertTournamentSchema.partial().parse(req.body);
      const updatedTournament = await storage.updateTournament(id, tournament);
      
      if (!updatedTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json(updatedTournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  app.delete("/api/tournaments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTournament(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tournament" });
    }
  });

  // Player routes - get players from user's tournaments only
  app.get("/api/players", isAuthenticated, async (req, res) => {
    try {
      // Get user's tournaments
      const userTournaments = await storage.getUserTournaments(req.user!.id);
      const tournamentIds = userTournaments.map(t => t.id);
      
      // Get players from these tournaments
      const allPlayers = new Set();
      for (const tournamentId of tournamentIds) {
        const result = await db.execute(sql`
          SELECT DISTINCT p.* FROM players p
          JOIN tournament_players tp ON p.id = tp.player_id
          WHERE tp.tournament_id = ${tournamentId}
        `);
        result.rows.forEach(player => allPlayers.add(JSON.stringify(player)));
      }
      
      // Convert back to array of unique players
      const players = Array.from(allPlayers).map(p => JSON.parse(p as string));
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to get players" });
    }
  });

  // Get tournaments for a specific player
  app.get("/api/players/:playerId/tournaments", async (req, res) => {
    try {
      const playerId = req.params.playerId;
      const { pool } = await import("./db");
      
      const result = await pool.query(`
        SELECT DISTINCT t.id, t.name, t.description, t.is_active
        FROM tournaments t
        INNER JOIN tournament_players tp ON t.id = tp.tournament_id
        WHERE tp.player_id = $1
        ORDER BY t.name
      `, [playerId]);
      
      res.json(result.rows);
    } catch (error) {
      console.error("Error getting player tournaments:", error);
      res.status(500).json({ message: "Failed to get player tournaments" });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const player = await storage.getPlayer(id);
      
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      res.json(player);
    } catch (error) {
      res.status(500).json({ message: "Failed to get player" });
    }
  });

  app.post("/api/players", isAuthenticated, async (req, res) => {
    try {
      console.log("🔍 Player creation request body:", JSON.stringify(req.body, null, 2));
      
      // Extended validation for required email field with date transformation
      const playerValidationSchema = insertPlayerSchema.extend({
        email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
        subscriptionValidUntil: z.string().transform(str => new Date(str)).optional()
      });
      
      console.log("🔍 Validating against schema...");
      const player = playerValidationSchema.parse(req.body);
      console.log("✅ Validation passed, player data:", JSON.stringify(player, null, 2));
      
      // Check for duplicate email only (players can have same names in different tournaments)
      if (player.email) {
        const existingPlayers = await storage.getPlayers();
        const duplicateEmail = existingPlayers.find(p => 
          p.email && p.email.toLowerCase() === player.email!.toLowerCase()
        );
        
        if (duplicateEmail) {
          return res.status(400).json({ 
            message: "A player with this email already exists. Please choose a different email." 
          });
        }
      }
      
      // Hash password if provided, otherwise set to null
      let hashedPassword = null;
      if (player.password) {
        const { hashPassword } = await import("./auth");
        hashedPassword = await hashPassword(player.password);
      }
      
      const createdPlayer = await storage.createPlayer({
        ...player,
        password: hashedPassword,
        subscriptionStatus: 'free_trial',
        subscriptionValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
        isActive: true
      });
      
      console.log("✅ Created new player:", createdPlayer.name, "with 3-month trial subscription");

      // TODO: Re-enable welcome email sending when proper SendGrid API key is configured
      console.log("📧 Email sending temporarily disabled - will re-enable when proper SendGrid API key is configured");
      
      /* Temporarily commented out until proper SendGrid API key is configured
      if (createdPlayer.email) {
        try {
          const { getEmailService } = await import("./email-service-disabled");
          const emailService = getEmailService();
          
          if (emailService) {
            const loginUrl = `${req.protocol}://${req.get('host')}/auth`;
            const subject = "Welcome to WynnrZ - Your Gaming Journey Begins!";
            
            await emailService.sendTournamentNotification(
              createdPlayer.email,
              createdPlayer.name,
              subject,
              `Welcome to WynnrZ, ${createdPlayer.name}! You've been successfully added with a 3-month free trial.`
            );
            
            console.log("📧 Welcome email sent to:", createdPlayer.email);
          }
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Don't fail the player creation if email fails
        }
      }
      */
      
      // Remove password from response
      const { password, ...playerWithoutPassword } = createdPlayer;
      res.status(201).json(playerWithoutPassword);
    } catch (error) {
      console.error("❌ Player creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("❌ Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.put("/api/players/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const player = insertPlayerSchema.partial().parse(req.body);
      
      // Check for duplicate player name if name is being updated
      if (player.name) {
        const existingPlayers = await storage.getPlayers();
        const duplicateName = existingPlayers.find(p => 
          p.id !== id && p.name.toLowerCase() === player.name.toLowerCase()
        );
        
        if (duplicateName) {
          return res.status(400).json({ 
            message: "A player with this name already exists. Please choose a different name." 
          });
        }
      }
      
      const updatedPlayer = await storage.updatePlayer(id, player);
      
      if (!updatedPlayer) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      res.json(updatedPlayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  app.delete("/api/players/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePlayer(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  // Get players available to add to tournament (not already in tournament)
  app.get("/api/tournaments/:id/available-players", async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const allPlayers = await storage.getPlayers();
      const tournamentPlayers = await storage.getTournamentPlayers(tournamentId);
      
      // Filter out players already in the tournament
      const tournamentPlayerIds = new Set(tournamentPlayers.map(p => p.id));
      const availablePlayers = allPlayers.filter(player => !tournamentPlayerIds.has(player.id));
      
      res.json(availablePlayers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available players" });
    }
  });

  // Get players with subscription status for UI filtering
  app.get("/api/players/with-subscription-status", isAuthenticated, async (req, res) => {
    try {
      const allPlayers = await storage.getPlayers();
      const now = new Date();
      
      const playersWithStatus = allPlayers.map(player => {
        const subscriptionStatus = player.subscriptionStatus || 'free_trial';
        const subscriptionValidUntil = player.subscriptionValidUntil;
        const validUntil = subscriptionValidUntil ? new Date(subscriptionValidUntil) : null;
        const isExpired = validUntil ? now > validUntil : false;
        
        return {
          ...player,
          isExpired: isExpired || subscriptionStatus === 'expired',
          subscriptionStatus: isExpired ? 'expired' : subscriptionStatus
        };
      });
      
      res.json(playersWithStatus);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players with subscription status" });
    }
  });

  // Tournament players
  app.get("/api/tournaments/:id/players", async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const players = await storage.getTournamentPlayers(tournamentId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tournament players" });
    }
  });

  app.post("/api/tournaments/:tournamentId/players/:playerId", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId;
      const playerId = req.params.playerId;
      
      console.log(`Server received request to add player ${playerId} to tournament ${tournamentId}`);
      
      // Get permissions from request body
      const { isAdministrator = false, canRecordResults = false } = req.body || {};
      
      // Validate both IDs exist
      const tournament = await storage.getTournament(tournamentId);
      const player = await storage.getPlayer(playerId);
      
      if (!tournament) {
        console.log(`Tournament ${tournamentId} not found`);
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      if (!player) {
        console.log(`Player ${playerId} not found`);
        return res.status(404).json({ message: "Player not found" });
      }
      
      // Check if player name already exists in this tournament
      const existingPlayers = await storage.getTournamentPlayers(tournamentId);
      const duplicateName = existingPlayers.find(p => 
        p.name.toLowerCase() === player.name.toLowerCase()
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: `A player with the name "${player.name}" already exists in this tournament. Please choose a different name or use a different player.` 
        });
      }
      
      // Check if this is the first player - make them administrator by default
      const autoAssignAdmin = existingPlayers.length === 0;
      
      try {
        const result = await storage.addPlayerToTournament({
          tournamentId,
          playerId,
          isAdministrator: autoAssignAdmin || isAdministrator,
          canRecordResults: autoAssignAdmin || canRecordResults
        });
        
        // Send welcome email to player when added to tournament
        try {
          if (player.email && emailService) {
            const welcomeData = {
              playerName: player.name,
              username: player.username || player.name,
              tournamentName: tournament.name,
              loginUrl: `${req.protocol}://${req.get('host')}/auth`,
              supportEmail: 'support@wynnrz.com'
            };
            
            await emailService.sendWelcome(player.email, welcomeData);
            console.log(`📧 Welcome email sent to ${player.email} for tournament ${tournament.name}`);
          }
        } catch (emailError) {
          console.warn('⚠️ Failed to send welcome email:', emailError);
          // Don't fail the main operation if email fails
        }
        
        console.log(`Successfully added player to tournament:`, result);
        res.status(201).json(result);
      } catch (err) {
        console.error(`Error in storage.addPlayerToTournament:`, err);
        throw err;
      }
    } catch (error) {
      console.error(`Failed to add player to tournament:`, error);
      res.status(500).json({ message: "Failed to add player to tournament: " + (error as Error).message });
    }
  });

  app.delete("/api/tournaments/:tournamentId/players/:playerId", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      const playerId = parseInt(req.params.playerId);
      
      // Get all tournament players to check admin status
      const tournamentPlayers = await storage.getTournamentPlayers(tournamentId);
      
      // Check if current user is an administrator
      const currentUser = req.user!.id;
      const currentUserPlayer = tournamentPlayers.find(player => 
        player.id === currentUser || player.email === req.user!.email
      );
      
      if (!currentUserPlayer?.isAdministrator) {
        return res.status(403).json({ 
          message: "Only tournament administrators can remove players" 
        });
      }
      
      // Check if target player is the last administrator
      const playerToRemove = tournamentPlayers.find(player => player.id === playerId);
      const adminPlayers = tournamentPlayers.filter(player => player.isAdministrator);
      
      if (playerToRemove?.isAdministrator && adminPlayers.length <= 1) {
        return res.status(403).json({ 
          message: "Cannot remove the last administrator from a tournament" 
        });
      }
      
      // Check if player is trying to remove themselves
      if (playerId === currentUser && playerToRemove?.isAdministrator) {
        // Force confirmation parameter
        const { confirmSelfRemoval } = req.query;
        if (confirmSelfRemoval !== 'true') {
          return res.status(400).json({ 
            message: "Self-removal of an administrator requires confirmation",
            requiresConfirmation: true
          });
        }
      }
      
      const removed = await storage.removePlayerFromTournament(tournamentId, playerId);
      
      if (!removed) {
        return res.status(404).json({ message: "Player not in tournament" });
      }
      
      // Log the removal in the admin activity logs
      await storage.logAdminActivity({
        tournamentId,
        adminId: currentUser,
        actionType: 'player_removed',
        targetPlayerId: playerId,
        details: {
          playerName: playerToRemove.name,
          wasAdmin: playerToRemove.isAdministrator,
          timestamp: new Date().toISOString()
        }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to remove player:", error);
      res.status(500).json({ message: "Failed to remove player from tournament" });
    }
  });
  
  // Update player permissions (admin status and recording rights)
  app.patch("/api/tournaments/:tournamentId/players/:playerId/permissions", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      const playerId = parseInt(req.params.playerId);
      const { isAdministrator, canRecordResults, canManageFormulas } = req.body;
      
      // Check if the current user is an admin in this tournament
      const tournamentPlayers = await storage.getTournamentPlayers(tournamentId);
      const currentUser = req.user!.id;
      
      const currentUserPlayer = tournamentPlayers.find(player => 
        player.id === currentUser || player.email === req.user!.email
      );
      
      if (!currentUserPlayer?.isAdministrator) {
        return res.status(403).json({ 
          message: "Only tournament administrators can modify player permissions" 
        });
      }
      
      // Get the player-tournament association
      const playerToUpdate = tournamentPlayers.find(player => player.id === playerId);
      
      if (!playerToUpdate) {
        return res.status(404).json({ message: "Player not found in tournament" });
      }
      
      // Track changes for logging
      const permissionChanges = [];
      if (isAdministrator !== undefined && isAdministrator !== playerToUpdate.isAdministrator) {
        permissionChanges.push({
          field: 'Administrator',
          old: playerToUpdate.isAdministrator,
          new: isAdministrator
        });
      }
      
      if (canRecordResults !== undefined && canRecordResults !== playerToUpdate.canRecordResults) {
        permissionChanges.push({
          field: 'Can Record Results',
          old: playerToUpdate.canRecordResults,
          new: canRecordResults
        });
      }
      
      if (canManageFormulas !== undefined && canManageFormulas !== playerToUpdate.canManageFormulas) {
        permissionChanges.push({
          field: 'Can Manage Formulas',
          old: playerToUpdate.canManageFormulas,
          new: canManageFormulas
        });
      }
      
      // Update the permissions
      const updatedPlayer = await storage.updateTournamentPlayerPermissions(
        tournamentId,
        playerId,
        { 
          isAdministrator: isAdministrator !== undefined ? isAdministrator : playerToUpdate.isAdministrator,
          canRecordResults: canRecordResults !== undefined ? canRecordResults : playerToUpdate.canRecordResults
        }
      );
      
      // Log the permission change
      if (permissionChanges.length > 0) {
        await storage.logAdminActivity({
          tournamentId,
          adminId: currentUser,
          actionType: 'permission_change',
          targetPlayerId: playerId,
          details: {
            changes: permissionChanges,
            playerName: playerToUpdate.name,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.status(200).json({
        ...updatedPlayer,
        notificationSent: permissionChanges.length > 0
      });
    } catch (error) {
      console.error("Failed to update player permissions:", error);
      res.status(500).json({ 
        message: "Failed to update player permissions: " + (error as Error).message 
      });
    }
  });

  // Admin Activity Logs
  app.get("/api/tournaments/:tournamentId/admin-logs", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      
      // Check if the user is an admin in this tournament
      const tournamentPlayers = await storage.getTournamentPlayers(tournamentId);
      const currentUser = req.user!.id;
      
      const currentUserPlayer = tournamentPlayers.find(player => 
        player.id === currentUser || player.email === req.user!.email
      );
      
      // Only admins can view logs
      if (!currentUserPlayer?.isAdministrator) {
        return res.status(403).json({ 
          message: "Only tournament administrators can view activity logs" 
        });
      }
      
      const logs = await storage.getAdminActivityLogs(tournamentId);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get admin logs:", error);
      res.status(500).json({ message: "Failed to get administrator activity logs" });
    }
  });
  
  // Game routes
  app.get("/api/games", async (req, res) => {
    try {
      const tournamentId = req.query.tournamentId as string | undefined;
      
      const games = await storage.getGames(tournamentId);
      res.json(games);
    } catch (error) {
      console.error("❌ Games API error:", error);
      res.status(500).json({ message: "Failed to get games" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const game = await storage.getGame(id);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  app.get("/api/games/:id/participants", async (req, res) => {
    try {
      const id = req.params.id; // UUID string, no parseInt needed
      const participants = await storage.getGameParticipants(id);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game participants" });
    }
  });

  app.post("/api/games", isAuthenticated, hasActiveSubscription, async (req, res) => {
    try {
      const { game, participants } = req.body;
      console.log("Raw request body:", JSON.stringify(req.body));
      console.log("Game data received:", JSON.stringify(game));
      console.log("Participants received:", JSON.stringify(participants));
      
      // Debug individual participant data
      participants.forEach((p, i) => {
        console.log(`Participant ${i}:`, {
          teamId: p.teamId,
          teamIdType: typeof p.teamId,
          playerId: p.playerId,
          playerIdType: typeof p.playerId
        });
      });
      
      // Basic data validation
      if (!game.tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required" });
      }
      
      if (!participants || !Array.isArray(participants) || participants.length < 2) {
        return res.status(400).json({ message: "At least two participants are required" });
      }
      
      // Format the game for database insertion
      const gameData = {
        tournamentId: game.tournamentId,
        date: new Date(game.date || new Date()),
        isTeamGame: game.isTeamGame || false,
        notes: game.notes || "",
        createdBy: req.user?.id || null
      };
      
      // Format participants data
      const participantsData = participants.map(p => {
        if (gameData.isTeamGame) {
          return {
            playerId: null,
            teamId: p.teamId || null,
            score: parseFloat(p.score || "0"),
            isWinner: Boolean(p.isWinner)
          };
        } else {
          return {
            playerId: p.playerId || null,
            teamId: null,
            score: parseFloat(p.score || "0"),
            isWinner: Boolean(p.isWinner)
          };
        }
      });
      
      try {
        // Use the storage interface which has proper transaction handling
        try {
          // Create the game record using the storage interface
          const newGame = await storage.createGame({
            tournamentId: gameData.tournamentId,
            date: gameData.date,
            isTeamGame: gameData.isTeamGame,
            notes: gameData.notes,
            createdBy: gameData.createdBy
          }, participantsData);
          
          // Capture leaderboard snapshot for movement tracking
          try {
            await captureLeaderboardSnapshot(gameData.tournamentId);
            console.log(`📸 Leaderboard snapshot captured for tournament ${gameData.tournamentId}`);
          } catch (snapshotError) {
            console.warn('⚠️ Failed to capture leaderboard snapshot:', snapshotError);
            // Don't fail the main operation if snapshot fails
          }

          // Distribute team points to individual players if this is a team game
          if (gameData.isTeamGame) {
            try {
              await distributeTeamPointsToPlayers(newGame.id);
              console.log(`🎯 Team points distributed for game ${newGame.id}`);
            } catch (distributionError) {
              console.warn('⚠️ Failed to distribute team points:', distributionError);
              // Don't fail the main operation if point distribution fails
            }
          }
          
          res.status(201).json(newGame);
        } catch (err) {
          console.error("Storage error:", err);
          throw err;
        }
      } catch (err: any) {
        console.error("Database error:", err);
        res.status(500).json({ message: `Failed to record game: ${err.message}` });
      }
    } catch (error: any) {
      console.error("Game creation error:", error);
      res.status(500).json({ message: "Failed to create game: " + error.message });
    }
  });

  // Team routes
  app.get("/api/tournaments/:tournamentId/teams", async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId; // Keep as string for UUID
      const teams = await storage.getTeams(tournamentId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const id = req.params.id; // Keep as string for UUID
      const team = await storage.getTeam(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team" });
    }
  });

  app.post("/api/teams", isAuthenticated, hasActiveSubscription, async (req, res) => {
    try {
      console.log("Team creation request:", req.body);
      
      // Extract playerIds but process them separately
      const { playerIds, ...teamData } = req.body;
      
      // Simple validation instead of schema to fix the error
      if (!teamData.name || !teamData.tournamentId) {
        return res.status(400).json({ 
          message: "Team name and tournament ID are required" 
        });
      }
      
      // Check for duplicate team name in the tournament
      const existingTeams = await storage.getTeams(teamData.tournamentId);
      const duplicateName = existingTeams.find(t => 
        t.name.toLowerCase() === teamData.name.toLowerCase()
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: "A team with this name already exists in this tournament. Please choose a different name." 
        });
      }
      
      // Check for duplicate players in the team
      if (Array.isArray(playerIds) && playerIds.length > 0) {
        const uniquePlayerIds = [...new Set(playerIds)];
        if (uniquePlayerIds.length !== playerIds.length) {
          return res.status(400).json({ 
            message: "Cannot add the same player to a team multiple times." 
          });
        }
      }
      
      // Create valid team data with proper structure
      const validTeamData = {
        id: nanoid(),
        tournamentId: teamData.tournamentId,
        name: teamData.name,
        description: teamData.description || '',
        playerCount: Array.isArray(playerIds) ? playerIds.length : 2
      };
      
      console.log("Validated team data:", validTeamData);
      
      // Create the team
      const createdTeam = await storage.createTeam(validTeamData);
      
      console.log("Team created:", createdTeam);
      
      // If playerIds provided, add them to the team
      if (Array.isArray(playerIds) && playerIds.length > 0) {
        for (const playerId of playerIds) {
          await storage.addPlayerToTeam({
            teamId: createdTeam.id,
            playerId
          });
        }
        console.log(`Added ${playerIds.length} players to team`);
      }
      
      // Get team members
      const teamMembers = await storage.getTeamMembers(createdTeam.id);
      
      res.status(201).json({
        ...createdTeam,
        players: teamMembers
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Failed to create team:", error);
      res.status(500).json({ message: "Failed to create team: " + (error as Error).message });
    }
  });

  app.put("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Keep as string for UUID
      const team = insertTeamSchema.partial().parse(req.body);
      const updatedTeam = await storage.updateTeam(id, team);
      
      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.patch("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Keep as string for UUID
      const team = insertTeamSchema.partial().parse(req.body);
      const updatedTeam = await storage.updateTeam(id, team);
      
      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Keep as string for UUID
      const deleted = await storage.deleteTeam(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Team members
  app.get("/api/teams/:id/members", async (req, res) => {
    try {
      const teamId = req.params.id; // Keep as string for UUID
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team members" });
    }
  });

  app.post("/api/teams/:teamId/members", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId; // Keep as string for UUID
      const { playerId } = req.body;
      
      // Validate both IDs exist
      const team = await storage.getTeam(teamId);
      const player = await storage.getPlayer(playerId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      const result = await storage.addPlayerToTeam({
        teamId,
        playerId
      });
      
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to add player to team" });
    }
  });

  app.delete("/api/teams/:teamId/members/:playerId", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.teamId; // Keep as string for UUID
      const playerId = req.params.playerId; // Keep as string for UUID
      
      const removed = await storage.removePlayerFromTeam(teamId, playerId);
      
      if (!removed) {
        return res.status(404).json({ message: "Player not in team" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove player from team" });
    }
  });

  // Leaderboard formulas
  app.get("/api/tournaments/:tournamentId/formulas", async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId; // UUID string, no parseInt needed
      const formulas = await storage.getLeaderboardFormulas(tournamentId);
      res.json(formulas);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaderboard formulas" });
    }
  });

  // Add endpoint to get user-specific formulas plus templates (for settings page)
  app.get("/api/leaderboard-formulas", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching user-specific leaderboard formulas...");
      
      // Get user's tournaments
      const userTournaments = await storage.getUserTournaments(req.user!.id);
      const tournamentIds = userTournaments.map(t => t.id);
      
      // Get formulas for user's tournaments
      let userFormulas = [];
      for (const tournamentId of tournamentIds) {
        const formulas = await storage.getLeaderboardFormulas(tournamentId);
        userFormulas.push(...formulas);
      }
      
      // Add the 5 default template formulas (Dominology is tournament-specific, not a default template)
      const templateFormulas = [
        {
          id: 'template-soccer',
          name: 'Soccer/Football',
          formula: {
            name: 'Soccer/Football',
            description: 'Win: 3, Loss: 0, Draw: 1',
            rules: [
              {
                id: 'win-rule',
                condition: { type: 'winner_score', operator: 'greater_than', value: 0 },
                winnerPoints: 3,
                loserPoints: 0,
                description: 'Win: 3 points'
              },
              {
                id: 'draw-rule',
                condition: { type: 'winner_score', operator: 'equals', value: 0 },
                winnerPoints: 1,
                loserPoints: 1,
                description: 'Draw: 1 point each'
              }
            ],
            defaultWinnerPoints: 3,
            defaultLoserPoints: 0
          },
          isDefault: true,
          tournamentId: null,
          createdBy: null,
          createdAt: new Date().toISOString()
        },
        {
          id: 'template-tennis',
          name: 'Tennis/Racket Sports',
          formula: {
            name: 'Tennis/Racket Sports',
            description: 'Win: 2, Loss: 0',
            rules: [
              {
                id: 'win-rule',
                condition: { type: 'winner_score', operator: 'greater_than', value: 0 },
                winnerPoints: 2,
                loserPoints: 0,
                description: 'Win: 2 points'
              }
            ],
            defaultWinnerPoints: 2,
            defaultLoserPoints: 0
          },
          isDefault: true,
          tournamentId: null,
          createdBy: null,
          createdAt: new Date().toISOString()
        },
        {
          id: 'template-basketball',
          name: 'Basketball',
          formula: {
            name: 'Basketball',
            description: 'Win: 2, Loss: 0',
            rules: [
              {
                id: 'win-rule',
                condition: { type: 'winner_score', operator: 'greater_than', value: 0 },
                winnerPoints: 2,
                loserPoints: 0,
                description: 'Win: 2 points'
              }
            ],
            defaultWinnerPoints: 2,
            defaultLoserPoints: 0
          },
          isDefault: true,
          tournamentId: null,
          createdBy: null,
          createdAt: new Date().toISOString()
        },
        {
          id: 'template-chess',
          name: 'Chess',
          formula: {
            name: 'Chess',
            description: 'Win: 1, Loss: 0, Draw: 0.5',
            rules: [
              {
                id: 'win-rule',
                condition: { type: 'winner_score', operator: 'greater_than', value: 0 },
                winnerPoints: 1,
                loserPoints: 0,
                description: 'Win: 1 point'
              },
              {
                id: 'draw-rule',
                condition: { type: 'winner_score', operator: 'equals', value: 0 },
                winnerPoints: 0.5,
                loserPoints: 0.5,
                description: 'Draw: 0.5 points each'
              }
            ],
            defaultWinnerPoints: 1,
            defaultLoserPoints: 0
          },
          isDefault: true,
          tournamentId: null,
          createdBy: null,
          createdAt: new Date().toISOString()
        },
        {
          id: 'template-points-based',
          name: 'Points-Based',
          formula: {
            name: 'Points-Based',
            description: 'Higher score wins, points = score difference',
            rules: [
              {
                id: 'score-diff-rule',
                condition: { type: 'winner_score', operator: 'greater_than', value: 0 },
                winnerPoints: 'score_difference',
                loserPoints: 0,
                description: 'Winner gets score difference as points'
              }
            ],
            defaultWinnerPoints: 1,
            defaultLoserPoints: 0
          },
          isDefault: true,
          tournamentId: null,
          createdBy: null,
          createdAt: new Date().toISOString()
        }
      ];
      
      const allFormulas = [...userFormulas, ...templateFormulas];
      console.log("Found formulas:", allFormulas.length);
      res.json(allFormulas);
    } catch (error) {
      console.error("Error fetching formulas:", error);
      res.status(500).json({ message: "Failed to get leaderboard formulas" });
    }
  });

  app.post("/api/leaderboard-formulas", isAuthenticated, async (req, res) => {
    try {
      console.log('🔧 Formula creation request body:', JSON.stringify(req.body, null, 2));
      console.log('🔧 User creating formula:', req.user?.id);
      
      const formula = insertLeaderboardFormulaSchema.parse({
        ...req.body,
        tournamentId: req.body.tournamentId, // Keep as string for UUID
        createdBy: req.user?.id
      });
      
      console.log('🔧 Parsed formula:', JSON.stringify(formula, null, 2));
      
      // Check for duplicate formula names in the same tournament
      const existingFormulas = await storage.getLeaderboardFormulas(formula.tournamentId);
      const duplicateName = existingFormulas.find(f => f.name.toLowerCase() === formula.name.toLowerCase());
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: `A formula with the name "${formula.name}" already exists in this tournament. Please choose a different name.` 
        });
      }
      
      const createdFormula = await storage.createLeaderboardFormula(formula);
      console.log('🔧 Created formula:', JSON.stringify(createdFormula, null, 2));
      res.status(201).json(createdFormula);
    } catch (error) {
      console.error('❌ Formula creation error:', error);
      if (error instanceof z.ZodError) {
        console.error('❌ Zod validation errors:', error.errors);
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create leaderboard formula: " + (error as Error).message });
    }
  });

  app.patch("/api/leaderboard-formulas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Keep as string UUID
      console.log('🔧 PATCH request body:', JSON.stringify(req.body, null, 2));
      console.log('🔧 Formula ID:', id);
      
      // Simple direct update - just pass the data straight through
      const updatedFormula = await storage.updateLeaderboardFormula(id, req.body);
      console.log('🔧 Updated formula result:', JSON.stringify(updatedFormula, null, 2));
      
      if (!updatedFormula) {
        return res.status(404).json({ message: "Leaderboard formula not found" });
      }
      
      res.json(updatedFormula);
    } catch (error) {
      console.error('🔧 Error updating formula:', error);
      res.status(500).json({ message: "Failed to update leaderboard formula", error: error.message });
    }
  });

  app.delete("/api/leaderboard-formulas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id; // Keep as string UUID
      const deleted = await storage.deleteLeaderboardFormula(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Leaderboard formula not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete leaderboard formula" });
    }
  });

  // Player Analytics endpoints
  app.get("/api/analytics/player", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get player record from database
      const player = await storage.getPlayerByUserId(userId);
      if (!player) {
        return res.status(404).json({ message: "Player profile not found" });
      }

      // Get all games for this player
      const allGames = await storage.getGames();
      const playerGames = [];
      
      for (const game of allGames) {
        const participants = await storage.getGameParticipants(game.id);
        const playerParticipant = participants.find(p => p.playerId === player.id || p.player_id === player.id);
        if (playerParticipant) {
          playerGames.push({
            ...game,
            participant: playerParticipant
          });
        }
      }

      // Calculate statistics
      const totalGames = playerGames.length;
      const wins = playerGames.filter(g => g.participant.isWinner || g.participant.is_winner).length;
      const losses = playerGames.filter(g => !(g.participant.isWinner || g.participant.is_winner)).length;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      // Calculate win streak
      let currentStreak = 0;
      let bestWinStreak = 0;
      let tempStreak = 0;

      const sortedGames = playerGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      for (const game of sortedGames) {
        if (game.participant.isWinner || game.participant.is_winner) {
          tempStreak++;
          if (currentStreak === 0) currentStreak = tempStreak;
        } else {
          if (tempStreak > bestWinStreak) bestWinStreak = tempStreak;
          tempStreak = 0;
          currentStreak = 0;
        }
      }
      if (tempStreak > bestWinStreak) bestWinStreak = tempStreak;

      const analytics = {
        totalGames,
        wins,
        losses,
        winRate: Math.round(winRate * 100) / 100,
        currentStreak,
        bestWinStreak,
        recentGames: sortedGames.slice(0, 5).map(g => ({
          id: g.id,
          date: g.date,
          isWinner: g.participant.isWinner || g.participant.is_winner,
          score: g.participant.score,
          gameType: g.isTeamGame || g.is_team_game ? 'Team' : 'Individual'
        }))
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching player analytics:", error);
      res.status(500).json({ message: "Failed to fetch player analytics" });
    }
  });

  app.get("/api/analytics/player/trends", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const player = await storage.getPlayerByUserId(userId);
      if (!player) {
        return res.status(404).json({ message: "Player profile not found" });
      }

      // Get games from last 12 months grouped by month
      const allGames = await storage.getGames();
      const playerGames = [];
      
      for (const game of allGames) {
        const participants = await storage.getGameParticipants(game.id);
        const playerParticipant = participants.find(p => p.player_id === player.id);
        if (playerParticipant) {
          playerGames.push({
            ...game,
            participant: playerParticipant
          });
        }
      }

      // Group by month for last 12 months
      const monthlyData = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        
        const monthGames = playerGames.filter(g => {
          const gameDate = new Date(g.date);
          return gameDate.getFullYear() === monthDate.getFullYear() && 
                 gameDate.getMonth() === monthDate.getMonth();
        });

        const wins = monthGames.filter(g => g.participant.is_winner).length;
        const total = monthGames.length;
        
        monthlyData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          games: total,
          wins,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0
        });
      }

      res.json({ monthlyTrends: monthlyData });
    } catch (error) {
      console.error("Error fetching player trends:", error);
      res.status(500).json({ message: "Failed to fetch player trends" });
    }
  });

  app.get("/api/analytics/player/rankings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const player = await storage.getPlayerByUserId(userId);
      if (!player) {
        return res.status(404).json({ message: "Player profile not found" });
      }

      // Get player's tournament rankings
      const tournaments = await storage.getUserTournaments(userId);
      const rankings = [];

      for (const tournament of tournaments) {
        try {
          // Get player leaderboard for this tournament
          const leaderboard = await storage.getPlayerLeaderboard(tournament.id);
          const playerEntry = leaderboard.find(entry => entry.id === parseInt(player.id));
          
          if (playerEntry) {
            rankings.push({
              tournamentId: tournament.id,
              tournamentName: tournament.name,
              position: playerEntry.position,
              points: playerEntry.points,
              gamesPlayed: playerEntry.gamesPlayed,
              winRate: playerEntry.wins > 0 ? Math.round((playerEntry.wins / playerEntry.gamesPlayed) * 100) : 0
            });
          }
        } catch (error) {
          console.warn(`Failed to get ranking for tournament ${tournament.id}:`, error);
        }
      }

      res.json({ tournamentRankings: rankings });
    } catch (error) {
      console.error("Error fetching player rankings:", error);
      res.status(500).json({ message: "Failed to fetch player rankings" });
    }
  });

  // User-specific data endpoints
  app.get("/api/my-games", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get games from tournaments where user is creator or participant
      const userTournaments = await storage.getUserTournaments(req.user.id);
      const tournamentIds = userTournaments.map(t => t.id);
      
      if (tournamentIds.length === 0) {
        return res.json([]);
      }

      // Get all games from user's tournaments
      const allGames = await storage.getGames();
      const userGames = allGames.filter(game => 
        tournamentIds.includes(game.tournamentId)
      );

      res.json(userGames);
    } catch (error) {
      console.error("Error fetching user games:", error);
      res.status(500).json({ message: "Failed to fetch user games" });
    }
  });

  // Payment endpoints
  app.get("/api/subscription/plans", (req, res) => {
    res.json(PRICING_PLANS);
  });

  app.post("/api/subscription/create-checkout-session", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.body;
      
      if (!planId || !PRICING_PLANS[planId as keyof typeof PRICING_PLANS]) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const user = req.user!;
      const playerEmail = user.email || `${user.username}@example.com`; // Fallback email if none provided
      
      const session = await createCheckoutSession(planId, user.id.toString(), playerEmail);
      
      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("❌ Failed to create checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Feedback endpoints
  app.post("/api/tournaments/:tournamentId/feedback", isAuthenticated, async (req, res) => {
    try {
      const { title, message, category, priority = "medium" } = req.body;
      const tournamentId = req.params.tournamentId;
      const submitterId = req.user!.id;



      const feedback = await storage.createFeedback({
        id: randomUUID(),
        tournamentId,
        userId: submitterId,
        message,
        category: category || 'general'
      });

      res.status(201).json(feedback);
    } catch (error) {
      console.error("❌ Failed to create feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/tournaments/:tournamentId/feedback", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId;
      const feedbacks = await storage.getFeedbackByTournament(tournamentId);
      res.json(feedbacks);
    } catch (error) {
      console.error("❌ Failed to get tournament feedback:", error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  app.get("/api/admin/feedback", isAuthenticated, async (req, res) => {
    try {
      // Check if user is app administrator
      if (!req.user?.isAppAdmin) {
        return res.status(403).json({ message: "Access denied. App administrator privileges required." });
      }

      const feedbacks = await storage.getAllFeedback();
      res.json(feedbacks);
    } catch (error) {
      console.error("❌ Failed to get all feedback:", error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  app.patch("/api/feedback/:feedbackId/status", isAuthenticated, async (req, res) => {
    try {
      const { feedbackId } = req.params;
      const { status } = req.body;
      
      // Check if user is app administrator
      if (!req.user?.isAppAdmin) {
        return res.status(403).json({ message: "Access denied. App administrator privileges required." });
      }

      const updatedFeedback = await storage.updateFeedbackStatus(feedbackId, status);
      
      if (!updatedFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      res.json(updatedFeedback);
    } catch (error) {
      console.error("❌ Failed to update feedback status:", error);
      res.status(500).json({ message: "Failed to update feedback status" });
    }
  });

  app.post("/api/feedback/:feedbackId/responses", isAuthenticated, async (req, res) => {
    try {
      const { message } = req.body;
      const feedbackId = req.params.feedbackId;
      const responderId = req.user!.id;
      const isFromAdmin = req.user!.isAppAdmin || false;

      // Get the original feedback to find the user who submitted it
      const originalFeedback = await storage.getFeedback(feedbackId);
      if (!originalFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      const response = await storage.createFeedbackResponse({
        feedbackId,
        responderId,
        message,
        isFromAdmin
      });

      // Create notification for the feedback author
      await storage.createNotification({
        userId: originalFeedback.user_id,
        type: 'feedback_response',
        title: 'Response to Your Feedback',
        message: `An administrator has responded to your feedback: "${originalFeedback.message.substring(0, 50)}..."`,
        data: {
          feedbackId: feedbackId,
          responseId: response.id,
          tournamentId: originalFeedback.tournament_id
        }
      });

      console.log(`📬 Created notification for user ${originalFeedback.user_id} about feedback response`);
      
      res.status(201).json(response);
    } catch (error) {
      console.error("❌ Failed to create feedback response:", error);
      res.status(500).json({ message: "Failed to respond to feedback" });
    }
  });

  // Get feedback responses for a specific feedback
  app.get("/api/feedback/:feedbackId/responses", async (req, res) => {
    try {
      const feedbackId = req.params.feedbackId;
      const responses = await storage.getFeedbackResponses(feedbackId);
      res.json(responses);
    } catch (error) {
      console.error("❌ Failed to get feedback responses:", error);
      res.status(500).json({ message: "Failed to get feedback responses" });
    }
  });

  // Notification endpoints
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("❌ Failed to get notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications/:notificationId/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = req.params.notificationId;
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Failed to mark notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Get user's own feedback submissions
  app.get("/api/my-feedback", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const feedback = await storage.getAllFeedback();
      const myFeedback = feedback.filter((f: any) => f.user_id === userId);
      res.json(myFeedback);
    } catch (error) {
      console.error("❌ Failed to get user feedback:", error);
      res.status(500).json({ message: "Failed to get user feedback" });
    }
  });

  // Create sample notifications for testing
  app.post("/api/create-sample-notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Create sample feedback response notification
      const notification1 = await storage.createNotification({
        id: `notification-${Date.now()}-1`,
        user_id: userId,
        type: 'feedback_response',
        title: 'Response to Your Feedback',
        message: 'An administrator has responded to your feedback about tournament improvements. Click to view the response.',
        data: { feedbackId: '54d065b1-b0d5-4be0-9870-29aaa4354c42' },
        is_read: false,
        created_at: new Date()
      });

      // Create sample tournament update notification
      const notification2 = await storage.createNotification({
        id: `notification-${Date.now()}-2`,
        user_id: userId,
        type: 'tournament_update',
        title: 'Tournament Schedule Update',
        message: 'The next tournament round has been scheduled for this weekend. Check the tournament page for details.',
        data: { tournamentId: 'some-tournament-id' },
        is_read: false,
        created_at: new Date()
      });

      res.json({ message: "Sample notifications created", notifications: [notification1, notification2] });
    } catch (error) {
      console.error("❌ Failed to create sample notifications:", error);
      res.status(500).json({ message: "Failed to create sample notifications" });
    }
  });

  app.get("/api/feedback/:feedbackId/responses", isAuthenticated, async (req, res) => {
    try {
      const feedbackId = req.params.feedbackId;
      const responses = await storage.getFeedbackResponses(feedbackId);
      res.json(responses);
    } catch (error) {
      console.error("❌ Failed to get feedback responses:", error);
      res.status(500).json({ message: "Failed to retrieve responses" });
    }
  });

  app.patch("/api/feedback/:feedbackId/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const feedbackId = req.params.feedbackId;
      
      const updatedFeedback = await storage.updateFeedbackStatus(feedbackId, status);
      
      if (!updatedFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      res.json(updatedFeedback);
    } catch (error) {
      console.error("❌ Failed to update feedback status:", error);
      res.status(500).json({ message: "Failed to update feedback status" });
    }
  });

  // Global Controls endpoints (App Admin only)
  app.get("/api/admin/global-controls/system-stats", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const activeTournaments = await storage.getActiveTournamentsCount();
      const totalGames = await storage.getTotalGamesCount();
      const totalPlayers = await storage.getTotalPlayersCount();
      
      const allUsers = await db.select().from(users);
      const adminUsers = allUsers.filter(u => u.isAppAdmin);
      const activeUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      
      const subscribedUsers = allUsers.filter(u => u.subscriptionStatus === 'active');
      const trialUsers = allUsers.filter(u => u.subscriptionStatus === 'free_trial');
      const expiredUsers = allUsers.filter(u => u.subscriptionStatus === 'expired');
      
      res.json({
        system: {
          activeTournaments,
          totalGames,
          totalPlayers,
          totalUsers: allUsers.length,
          adminUsers: adminUsers.length,
          activeUsers: activeUsers.length
        },
        subscriptions: {
          active: subscribedUsers.length,
          trial: trialUsers.length,
          expired: expiredUsers.length
        },
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      });
    } catch (error) {
      console.error("❌ Failed to get system stats:", error);
      res.status(500).json({ message: "Failed to get system statistics" });
    }
  });

  // Auto-approval settings endpoint
  app.post("/api/admin/global-controls/auto-approval", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { enabled, criteria } = req.body;
      
      // Store auto-approval settings (implement based on your needs)
      console.log("🔧 Setting auto-approval:", { enabled, criteria });
      
      res.json({ 
        message: "Auto-approval settings updated successfully",
        settings: { enabled, criteria }
      });
    } catch (error) {
      console.error("❌ Failed to update auto-approval settings:", error);
      res.status(500).json({ message: "Failed to update auto-approval settings" });
    }
  });

  // Default settings endpoint
  app.post("/api/admin/global-controls/default-settings", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { defaultGameType, defaultTrialDays, defaultFormula } = req.body;
      
      console.log("🔧 Setting default settings:", { defaultGameType, defaultTrialDays, defaultFormula });
      
      res.json({ 
        message: "Default settings updated successfully",
        settings: { defaultGameType, defaultTrialDays, defaultFormula }
      });
    } catch (error) {
      console.error("❌ Failed to update default settings:", error);
      res.status(500).json({ message: "Failed to update default settings" });
    }
  });

  // Inactive cleanup endpoint
  app.post("/api/admin/global-controls/inactive-cleanup", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { daysInactive = 90 } = req.body;
      
      // Find and cleanup inactive tournaments/players
      const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);
      
      // Get inactive tournaments (no games in specified period)
      const allTournaments = await storage.getTournaments();
      let cleanedCount = 0;
      
      for (const tournament of allTournaments) {
        const games = await storage.getGames(tournament.id);
        const recentGames = games.filter(game => new Date(game.createdAt) > cutoffDate);
        
        if (recentGames.length === 0 && games.length > 0) {
          // Mark as inactive but don't delete (safety measure)
          await storage.updateTournament(parseInt(tournament.id), { isActive: false });
          cleanedCount++;
        }
      }
      
      console.log("🧹 Cleaned up inactive tournaments:", cleanedCount);
      
      res.json({ 
        message: `Successfully processed inactive cleanup. ${cleanedCount} tournaments marked as inactive.`,
        cleanedCount
      });
    } catch (error) {
      console.error("❌ Failed to perform inactive cleanup:", error);
      res.status(500).json({ message: "Failed to perform inactive cleanup" });
    }
  });

  // Email templates endpoint
  app.get("/api/admin/global-controls/email-templates", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const templates = [
        { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to WynnrZ!', type: 'user_registration' },
        { id: 'tournament_invite', name: 'Tournament Invitation', subject: 'You\'re invited to join a tournament', type: 'tournament' },
        { id: 'game_reminder', name: 'Game Reminder', subject: 'Upcoming game reminder', type: 'game' },
        { id: 'subscription_expiry', name: 'Subscription Expiry', subject: 'Your subscription expires soon', type: 'subscription' }
      ];
      
      res.json(templates);
    } catch (error) {
      console.error("❌ Failed to get email templates:", error);
      res.status(500).json({ message: "Failed to get email templates" });
    }
  });

  app.put("/api/admin/global-controls/email-templates/:templateId", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const { subject, content } = req.body;
      
      console.log("📧 Updating email template:", templateId, { subject, content });
      
      res.json({ 
        message: "Email template updated successfully",
        template: { id: templateId, subject, content }
      });
    } catch (error) {
      console.error("❌ Failed to update email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.get("/api/admin/global-controls/users", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      
      const sanitizedUsers = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        is_app_admin: user.is_app_admin,
        subscription_status: user.subscription_status,
        subscription_type: user.subscription_type,
        subscription_valid_until: user.subscription_valid_until,
        created_at: user.created_at,
        last_login: user.last_login
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("❌ Failed to get users:", error);
      res.status(500).json({ message: "Failed to get user list" });
    }
  });

  app.put("/api/admin/global-controls/users/:userId/status", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { is_admin, subscription_status, subscription_type, subscription_valid_until } = req.body;
      
      const [updatedUser] = await db
        .update(users)
        .set({ 
          is_admin,
          subscription_status,
          subscription_type,
          subscription_valid_until
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User status updated successfully", user: updatedUser });
    } catch (error) {
      console.error("❌ Failed to update user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.get("/api/admin/global-controls/tournaments", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const allTournaments = await storage.getTournaments();
      
      const tournamentsWithStats = await Promise.all(
        allTournaments.map(async (tournament) => {
          const players = await storage.getTournamentPlayers(tournament.id);
          const games = await storage.getGames(tournament.id);
          
          return {
            ...tournament,
            playerCount: players.length,
            gameCount: games.length
          };
        })
      );
      
      res.json(tournamentsWithStats);
    } catch (error) {
      console.error("❌ Failed to get tournaments:", error);
      res.status(500).json({ message: "Failed to get tournament list" });
    }
  });

  app.put("/api/admin/global-controls/tournaments/:tournamentId/status", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { is_active } = req.body;
      
      const updatedTournament = await storage.updateTournament(tournamentId, { is_active });
      
      if (!updatedTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json({ message: "Tournament status updated successfully", tournament: updatedTournament });
    } catch (error) {
      console.error("❌ Failed to update tournament status:", error);
      res.status(500).json({ message: "Failed to update tournament status" });
    }
  });

  // Tournament Administrator feedback view
  app.get("/api/tournaments/:tournamentId/feedback", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId;
      const feedback = await storage.getFeedbackByTournament(tournamentId);
      res.json(feedback);
    } catch (error) {
      console.error("❌ Failed to get tournament feedback:", error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  // App Administrator endpoints

  // Photo upload endpoint
  app.post("/api/upload/image", isAuthenticated, async (req, res) => {
    try {
      // For now, return a placeholder response to fix the upload error
      // To implement actual image storage, you'll need to provide cloud storage credentials
      res.status(501).json({ 
        error: "Image upload requires cloud storage setup",
        message: "Please configure AWS S3, Cloudinary, or similar service for image storage"
      });
    } catch (error) {
      console.error("❌ Image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Password update endpoint
  app.put("/api/user/password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Get current user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const { comparePasswords } = await import("./auth");
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const { hashPassword } = await import("./auth");
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password in database
      await storage.updateUser(userId, { password: hashedNewPassword });

      res.json({ 
        message: "Password updated successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("❌ Password update error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Social Features - Activity Feed
  app.get("/api/activity-feed", isAuthenticated, async (req, res) => {
    try {
      const { tournamentId, playerId, limit = '20' } = req.query;
      
      // Generate activity feed based on recent games and achievements
      const activities = await storage.getActivityFeed({
        tournamentId: tournamentId as string,
        playerId: playerId as string,
        limit: parseInt(limit as string)
      });
      
      res.json(activities);
    } catch (error) {
      console.error("❌ Activity feed error:", error);
      res.status(500).json({ error: "Failed to fetch activity feed" });
    }
  });

  // Like/Unlike activity
  app.post("/api/activity/:activityId/like", isAuthenticated, async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = req.user!.id;
      
      const result = await storage.toggleActivityLike(activityId, userId);
      res.json(result);
    } catch (error) {
      console.error("❌ Activity like error:", error);
      res.status(500).json({ error: "Failed to like activity" });
    }
  });

  // Biometric Authentication Endpoints
  app.post("/api/auth/biometric/register-challenge", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      // Generate challenge for WebAuthn registration
      const challenge = crypto.randomBytes(32);
      
      // Store challenge temporarily
      req.session.biometricChallenge = challenge.toString('base64url');
      
      res.json({
        challenge: challenge.toString('base64url'),
        user: {
          id: user.id,
          username: user.username,
          name: user.name
        }
      });
    } catch (error) {
      console.error("❌ Biometric challenge error:", error);
      res.status(500).json({ error: "Failed to generate biometric challenge" });
    }
  });

  app.post("/api/auth/biometric/register", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { id, rawId, response, type } = req.body;
      
      // In a real implementation, you'd verify the attestation here
      // For now, we'll store the credential
      await storage.storeBiometricCredential({
        userId: user.id,
        credentialId: id,
        publicKey: JSON.stringify(response),
        counter: 0
      });
      
      res.json({ success: true, message: "Biometric credential registered" });
    } catch (error) {
      console.error("❌ Biometric registration error:", error);
      res.status(500).json({ error: "Failed to register biometric credential" });
    }
  });

  app.post("/api/auth/biometric/login-challenge", async (req, res) => {
    try {
      // Generate challenge for WebAuthn authentication
      const challenge = crypto.randomBytes(32);
      
      // Get all registered credentials for authentication
      const allowCredentials = await storage.getAllBiometricCredentials();
      
      // Store challenge temporarily
      req.session.biometricChallenge = challenge.toString('base64url');
      
      res.json({
        challenge: challenge.toString('base64url'),
        allowCredentials: allowCredentials.map(cred => ({
          id: cred.credentialId,
          type: 'public-key'
        }))
      });
    } catch (error) {
      console.error("❌ Biometric login challenge error:", error);
      res.status(500).json({ error: "Failed to generate login challenge" });
    }
  });

  app.post("/api/auth/biometric/login", async (req, res) => {
    try {
      const { id, rawId, response, type } = req.body;
      
      console.log("🔐 Biometric login attempt:", { id, type, hasResponse: !!response });
      
      // Validate WebAuthn response structure
      if (!response || !response.authenticatorData || !response.signature || !response.clientDataJSON) {
        console.error("❌ Invalid WebAuthn response structure");
        return res.status(400).json({ error: "Invalid authentication response" });
      }
      
      // Check session challenge
      if (!req.session.biometricChallenge) {
        console.error("❌ No biometric challenge in session");
        return res.status(400).json({ error: "No authentication challenge found" });
      }
      
      // Find the credential
      const credential = await storage.getBiometricCredential(id);
      if (!credential) {
        console.error("❌ Credential not found:", id);
        return res.status(404).json({ error: "Credential not found" });
      }
      
      // Verify client data
      try {
        const clientData = JSON.parse(Buffer.from(response.clientDataJSON, 'base64url').toString());
        console.log("🔍 Client data:", clientData);
        
        // Check challenge matches
        if (clientData.challenge !== req.session.biometricChallenge) {
          console.error("❌ Challenge mismatch");
          return res.status(400).json({ error: "Authentication challenge mismatch" });
        }
        
        // Check origin (in production, verify against your domain)
        if (clientData.type !== 'webauthn.get') {
          console.error("❌ Invalid client data type");
          return res.status(400).json({ error: "Invalid authentication type" });
        }
        
      } catch (e) {
        console.error("❌ Invalid client data JSON:", e);
        return res.status(400).json({ error: "Invalid client data" });
      }
      
      // Get user
      const user = await storage.getUser(credential.userId);
      if (!user) {
        console.error("❌ User not found:", credential.userId);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Clear the challenge
      delete req.session.biometricChallenge;
      
      console.log("✅ Biometric authentication successful for user:", user.username);
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("❌ Biometric login error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isAppAdmin: user.isAppAdmin
        });
      });
    } catch (error) {
      console.error("❌ Biometric authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Biometric status and management routes
  app.get("/api/auth/biometric/status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const credentials = await storage.getUserBiometricCredentials(user.id);
      res.json({ enabled: credentials.length > 0 });
    } catch (error) {
      console.error("❌ Biometric status error:", error);
      res.status(500).json({ error: "Failed to get biometric status" });
    }
  });

  app.delete("/api/auth/biometric/disable", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      await storage.deleteBiometricCredentials(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Biometric disable error:", error);
      res.status(500).json({ error: "Failed to disable biometric authentication" });
    }
  });

  // Subscription management routes
  app.get("/api/subscription/my-status-debug", isAuthenticated, async (req, res) => {
    // Fresh endpoint to bypass cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("🔔 Checking subscription for user:", user.username);
      console.log("🔔 User subscription data:", {
        status: user.subscriptionStatus || user.subscription_status,
        type: user.subscriptionType || user.subscription_type,
        validUntil: user.subscriptionValidUntil || user.subscription_valid_until
      });

      // Get subscription data using correct field names
      const subscriptionStatus = user.subscriptionStatus || user.subscription_status || 'free_trial';
      const subscriptionType = user.subscriptionType || user.subscription_type;
      const subscriptionValidUntil = user.subscriptionValidUntil || user.subscription_valid_until;

      // Check if subscription is valid
      const now = new Date();
      const validUntil = subscriptionValidUntil ? new Date(subscriptionValidUntil) : null;
      const isExpired = validUntil ? now > validUntil : false;
      
      let status = subscriptionStatus;
      if (status === 'active' && isExpired) {
        status = 'expired';
      }

      // Show warning only if subscription expires within 30 days (1 month)
      const daysUntilExpiry = validUntil ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const needsWarning = isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 30);

      const subscriptionData = {
        subscriptionStatus: status,
        subscriptionType: subscriptionType,
        subscriptionValidUntil: subscriptionValidUntil,
        isExpired,
        needsWarning,
        daysUntilExpiry
      };

      console.log("🔔 Final subscription data:", subscriptionData);
      res.json(subscriptionData);
    } catch (error) {
      console.error("❌ Failed to get user subscription status:", error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Admin: Check all subscriptions
  app.get("/api/admin/subscriptions", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isAppAdmin) {
        return res.status(403).json({ message: "Access denied. App administrator privileges required." });
      }

      const { subscriptionManager } = await import("./subscription-manager");
      const subscriptions = await subscriptionManager.checkAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("❌ Failed to get all subscriptions:", error);
      res.status(500).json({ message: "Failed to get subscriptions" });
    }
  });

  // Admin: Process subscription warnings (send emails)
  app.post("/api/admin/subscriptions/process-warnings", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isAppAdmin) {
        return res.status(403).json({ message: "Access denied. App administrator privileges required." });
      }

      const { subscriptionManager } = await import("./subscription-manager");
      const result = await subscriptionManager.processSubscriptionWarnings();
      res.json({ 
        message: `Processed warnings: ${result.sent} sent, ${result.failed} failed`,
        ...result 
      });
    } catch (error) {
      console.error("❌ Failed to process subscription warnings:", error);
      res.status(500).json({ message: "Failed to process warnings" });
    }
  });

  // Notification preferences routes
  app.get("/api/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      const preferences = await storage.getNotificationPreferences(req.user!.id);
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  });

  app.put("/api/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      const preferences = await storage.updateNotificationPreferences(req.user!.id, req.body);
      res.json(preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // Get active players for team selection (excludes expired)
  app.get("/api/players/active", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionManager } = await import("./subscription-manager");
      const activePlayers = await subscriptionManager.getActiveSubscriptionPlayers();
      res.json(activePlayers);
    } catch (error) {
      console.error("❌ Failed to get active players:", error);
      res.status(500).json({ message: "Failed to get active players" });
    }
  });

  // Get available years for a tournament (for date filtering)
  app.get("/api/tournaments/:tournamentId/years", async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId;
      const { pool } = await import("./db");
      const result = await pool.query(
        `SELECT DISTINCT EXTRACT(YEAR FROM date) as year 
         FROM games 
         WHERE tournament_id = $1 
         ORDER BY year DESC`,
        [tournamentId]
      );
      const years = result.rows.map(row => parseInt(row.year));
      res.json(years);
    } catch (error) {
      console.error("Error getting tournament years:", error);
      res.status(500).json({ error: "Failed to get tournament years" });
    }
  });
  
  // Player Leaderboard route
  app.get("/api/tournaments/:id/player-leaderboard", async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const { year, month } = req.query;
      
      console.log('🎯 Individual leaderboard request for tournament:', tournamentId, 'with filters:', { year, month });
      
      // Use the new UUID-compatible leaderboard function
      const { calculatePlayerLeaderboardUUID } = await import("./leaderboard-uuid-fix");
      const leaderboard = await calculatePlayerLeaderboardUUID(tournamentId, { year: year as string, month: month as string });
      
      // Get movement data for players
      const movementData = await getMovementData(tournamentId, 'player');
      
      // Add movement indicators to each player
      const leaderboardWithMovement = leaderboard.map(player => ({
        ...player,
        movement: movementData.get(player.id.toString()) || null
      }));
      
      res.json(leaderboardWithMovement);
    } catch (error) {
      console.error("Error getting player leaderboard:", error);
      res.status(500).json({ message: "Failed to get player leaderboard" });
    }
  });
  
  // Team Leaderboard route
  app.get("/api/tournaments/:id/team-leaderboard", async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const { year, month } = req.query;
      
      console.log('🏆 Team leaderboard request for tournament:', tournamentId, 'with filters:', { year, month });
      
      // Use the new UUID-compatible leaderboard function
      const { calculateTeamLeaderboardUUID } = await import("./leaderboard-uuid-fix");
      const leaderboard = await calculateTeamLeaderboardUUID(tournamentId, { year: year as string, month: month as string });
      
      // Get movement data for teams
      const movementData = await getMovementData(tournamentId, 'team');
      
      // Add movement indicators to each team
      const leaderboardWithMovement = leaderboard.map(team => ({
        ...team,
        movement: movementData.get(team.id.toString()) || null
      }));
      
      res.json(leaderboardWithMovement);
    } catch (error) {
      console.error("Error getting team leaderboard:", error);
      res.status(500).json({ message: "Failed to get team leaderboard" });
    }
  });

  // Admin subscription pricing API
  app.get("/api/admin/subscription-pricing", async (req, res) => {
    try {
      console.log("📊 GET pricing request - Reading from subscription_pricing table");
      
      // Get pricing for all currencies
      const result = await pool.query('SELECT * FROM subscription_pricing ORDER BY currency_code');
      const pricingData = result.rows;
      
      console.log("📊 Found pricing data:", pricingData);
      
      // Transform to expected format for backward compatibility
      const response = {};
      pricingData.forEach(row => {
        const currency = row.currency_code.toLowerCase();
        response[`monthlyPrice${currency.charAt(0).toUpperCase() + currency.slice(1)}`] = row.monthly_price;
        response[`annualPrice${currency.charAt(0).toUpperCase() + currency.slice(1)}`] = row.annual_price;
      });
      
      console.log("📊 Sending pricing response:", response);
      res.json(response);
    } catch (error) {
      console.error("❌ Pricing GET error:", error);
      res.status(500).json({ message: "Failed to get subscription pricing" });
    }
  });

  app.post("/api/admin/subscription-pricing", async (req, res) => {
    try {
      console.log("🔐 Pricing update debug:", {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userObject: req.user,
        isAppAdmin: req.user?.isAppAdmin
      });

      // Check authentication first
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Standardized app admin check
      if (!req.user?.isAppAdmin) {
        return res.status(403).json({ message: "Access denied. App administrator privileges required." });
      }

      const { monthlyPriceUsd, monthlyPriceGbp, monthlyPriceEur, annualPriceUsd, annualPriceGbp, annualPriceEur } = req.body;
      
      console.log("📋 Received pricing data:", { monthlyPriceUsd, monthlyPriceGbp, monthlyPriceEur, annualPriceUsd, annualPriceGbp, annualPriceEur });
      
      // Update pricing for each currency
      const currencies = [
        { code: 'USD', monthly: monthlyPriceUsd, annual: annualPriceUsd },
        { code: 'GBP', monthly: monthlyPriceGbp, annual: annualPriceGbp },
        { code: 'EUR', monthly: monthlyPriceEur, annual: annualPriceEur }
      ];
      
      console.log("📋 Currency update mapping:", currencies);

      for (const currency of currencies) {
        if (currency.monthly !== undefined && currency.annual !== undefined) {
          await pool.query(`
            UPDATE subscription_pricing 
            SET monthly_price = $1, 
                annual_price = $2,
                updated_at = NOW()
            WHERE currency_code = $3
          `, [currency.monthly, currency.annual, currency.code]);
        }
      }

      console.log("📋 Updated subscription pricing in database for all currencies");
      
      res.json({ 
        message: "Subscription pricing updated successfully",
        data: { monthlyPriceUsd, monthlyPriceGbp, monthlyPriceEur, annualPriceUsd, annualPriceGbp, annualPriceEur }
      });
    } catch (error) {
      console.error("Error updating subscription pricing:", error);
      res.status(500).json({ message: "Failed to update subscription pricing" });
    }
  });

  // Advanced Analytics Endpoints for App Administrators
  app.get('/api/admin/analytics/tournaments', isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // Most active tournaments by game count
      const tournamentActivity = await pool.query(`
        SELECT 
          t.name,
          t.game_type,
          COALESCE(game_stats.game_count, 0) as game_count,
          COALESCE(player_stats.player_count, 0) as player_count,
          t.created_at
        FROM tournaments t
        LEFT JOIN (
          SELECT tournament_id, COUNT(*) as game_count
          FROM games
          GROUP BY tournament_id
        ) game_stats ON t.id = game_stats.tournament_id
        LEFT JOIN (
          SELECT tournament_id, COUNT(DISTINCT player_id) as player_count
          FROM tournament_players
          GROUP BY tournament_id
        ) player_stats ON t.id = player_stats.tournament_id
        ORDER BY game_count DESC
        LIMIT 10
      `);

      // Game type distribution
      const gameTypes = await pool.query(`
        SELECT 
          game_type,
          COUNT(*) as tournament_count,
          SUM(game_count) as total_games
        FROM (
          SELECT 
            t.game_type,
            COUNT(g.id) as game_count
          FROM tournaments t
          LEFT JOIN games g ON t.id = g.tournament_id
          GROUP BY t.id, t.game_type
        ) AS tournament_games
        GROUP BY game_type
        ORDER BY tournament_count DESC
      `);

      res.json({
        mostActiveTournaments: tournamentActivity.rows,
        gameTypeDistribution: gameTypes.rows
      });
    } catch (error) {
      console.error('Error fetching tournament analytics:', error);
      res.status(500).json({ message: 'Failed to fetch tournament analytics' });
    }
  });

  app.get('/api/admin/analytics/players', isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // Most active players across all tournaments
      const activePlayersSql = `
        SELECT 
          p.name,
          COUNT(DISTINCT tp.tournament_id) as tournaments_joined,
          COUNT(DISTINCT gp.game_id) as games_played,
          p.created_at
        FROM players p
        LEFT JOIN tournament_players tp ON p.id = tp.player_id
        LEFT JOIN game_participants gp ON p.id = gp.player_id
        GROUP BY p.id, p.name, p.created_at
        HAVING COUNT(DISTINCT gp.game_id) > 0
        ORDER BY games_played DESC, tournaments_joined DESC
        LIMIT 10
      `;

      // Most engaged tournament admins
      const adminActivitySql = `
        SELECT 
          u.name,
          u.username,
          COUNT(DISTINCT t.id) as tournaments_created,
          COUNT(DISTINCT g.id) as games_recorded,
          u.created_at
        FROM users u
        LEFT JOIN tournaments t ON u.id = t.created_by
        LEFT JOIN games g ON u.id = g.created_by
        WHERE u.is_admin = true
        GROUP BY u.id, u.name, u.username, u.created_at
        HAVING COUNT(DISTINCT t.id) > 0
        ORDER BY tournaments_created DESC, games_recorded DESC
        LIMIT 10
      `;

      const [activePlayers, adminActivity] = await Promise.all([
        pool.query(activePlayersSql),
        pool.query(adminActivitySql)
      ]);

      res.json({
        mostActivePlayers: activePlayers.rows,
        mostEngagedAdmins: adminActivity.rows
      });
    } catch (error) {
      console.error('Error fetching player analytics:', error);
      res.status(500).json({ message: 'Failed to fetch player analytics' });
    }
  });

  app.get('/api/admin/analytics/system', isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // Recent activity (last 30 days)
      const recentActivity = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM tournaments WHERE created_at >= NOW() - INTERVAL '30 days') as new_tournaments,
          (SELECT COUNT(*) FROM players WHERE created_at >= NOW() - INTERVAL '30 days') as new_players,
          (SELECT COUNT(*) FROM games WHERE created_at >= NOW() - INTERVAL '30 days') as recent_games
      `);

      // Inactive/Closed tournaments (no games in last 30 days or marked inactive)
      const inactiveTournaments = await pool.query(`
        SELECT 
          t.id,
          t.name,
          t.created_at,
          t.is_active,
          COUNT(g.id) as total_games,
          MAX(g.created_at) as last_game_date
        FROM tournaments t
        LEFT JOIN games g ON t.id = g.tournament_id
        GROUP BY t.id, t.name, t.created_at, t.is_active
        HAVING 
          t.is_active = false 
          OR MAX(g.created_at) < NOW() - INTERVAL '30 days' 
          OR COUNT(g.id) = 0
        ORDER BY t.created_at DESC
        LIMIT 10
      `);

      // Weekly growth trends (last 8 weeks)
      const weeklyGrowth = await pool.query(`
        SELECT 
          DATE_TRUNC('week', week_date) as week,
          COALESCE(new_tournaments, 0) as new_tournaments,
          COALESCE(new_players, 0) as new_players
        FROM (
          SELECT generate_series(
            DATE_TRUNC('week', NOW() - INTERVAL '8 weeks'),
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) as week_date
        ) weeks
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as new_tournaments
          FROM tournaments 
          WHERE created_at >= NOW() - INTERVAL '8 weeks'
          GROUP BY DATE_TRUNC('week', created_at)
        ) t_growth ON weeks.week_date = t_growth.week
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as new_players
          FROM players 
          WHERE created_at >= NOW() - INTERVAL '8 weeks'
          GROUP BY DATE_TRUNC('week', created_at)
        ) p_growth ON weeks.week_date = p_growth.week
        ORDER BY week DESC
      `);

      // Formula usage statistics
      const formulaUsage = await pool.query(`
        SELECT 
          lf.name,
          COUNT(DISTINCT lf.tournament_id) as tournaments_using,
          lf.created_at
        FROM leaderboard_formulas lf
        GROUP BY lf.id, lf.name, lf.created_at
        ORDER BY tournaments_using DESC
        LIMIT 5
      `);

      // Platform health metrics
      const healthMetrics = await pool.query(`
        SELECT 
          (SELECT ROUND(AVG(game_count), 1) FROM (
            SELECT COUNT(g.id) as game_count 
            FROM tournaments t 
            LEFT JOIN games g ON t.id = g.tournament_id 
            GROUP BY t.id
          ) AS tournament_games) as avg_games_per_tournament,
          (SELECT COUNT(*) FROM leaderboard_formulas) as active_formulas,
          (SELECT ROUND(
            (COUNT(CASE WHEN game_count > 0 THEN 1 END) * 100.0 / COUNT(*)), 1
          ) FROM (
            SELECT t.id, COUNT(g.id) as game_count 
            FROM tournaments t 
            LEFT JOIN games g ON t.id = g.tournament_id 
            GROUP BY t.id
          ) AS tournament_activity) as completion_rate
      `);

      res.json({
        recentActivity: recentActivity.rows[0],
        inactiveTournaments: inactiveTournaments.rows,
        weeklyGrowth: weeklyGrowth.rows,
        formulaUsage: formulaUsage.rows,
        healthMetrics: healthMetrics.rows[0]
      });
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      res.status(500).json({ message: 'Failed to fetch system analytics' });
    }
  });

  app.get('/api/admin/analytics/trends', isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // User registration trends over time (last 90 days by week)
      const registrationTrends = await pool.query(`
        SELECT 
          DATE_TRUNC('week', u.created_at) as week,
          COUNT(*) as new_users
        FROM users u
        WHERE u.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', u.created_at)
        ORDER BY week DESC
        LIMIT 12
      `);

      // Daily activity trends (last 30 days)
      const dailyActivity = await pool.query(`
        SELECT 
          DATE(g.created_at) as activity_date,
          COUNT(g.id) as games_played,
          COUNT(DISTINCT g.tournament_id) as active_tournaments,
          COUNT(DISTINCT gp.player_id) as active_players
        FROM games g
        LEFT JOIN game_participants gp ON g.id = gp.game_id
        WHERE g.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(g.created_at)
        ORDER BY activity_date DESC
        LIMIT 30
      `);

      // Peak usage analysis (by hour of day)
      const peakUsage = await pool.query(`
        SELECT 
          EXTRACT(hour FROM g.created_at) as hour_of_day,
          COUNT(*) as games_count,
          COUNT(DISTINCT DATE(g.created_at)) as active_days
        FROM games g
        WHERE g.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(hour FROM g.created_at)
        ORDER BY games_count DESC
      `);

      // Player retention metrics
      const retentionMetrics = await pool.query(`
        SELECT 
          (SELECT COUNT(DISTINCT p.id) FROM players p 
           JOIN game_participants gp ON p.id = gp.player_id 
           JOIN games g ON gp.game_id = g.id 
           WHERE g.created_at >= NOW() - INTERVAL '7 days') as active_last_7_days,
          (SELECT COUNT(DISTINCT p.id) FROM players p 
           JOIN game_participants gp ON p.id = gp.player_id 
           JOIN games g ON gp.game_id = g.id 
           WHERE g.created_at >= NOW() - INTERVAL '30 days') as active_last_30_days,
          (SELECT COUNT(*) FROM players) as total_players
      `);

      res.json({
        registrationTrends: registrationTrends.rows,
        dailyActivity: dailyActivity.rows,
        peakUsage: peakUsage.rows,
        retentionMetrics: retentionMetrics.rows[0]
      });
    } catch (error) {
      console.error('Error fetching trend analytics:', error);
      res.status(500).json({ message: 'Failed to fetch trend analytics' });
    }
  });

  app.get('/api/admin/analytics/game-types', isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // Most popular game types by tournament count
      const popularGameTypes = await pool.query(`
        SELECT 
          t.game_type,
          COUNT(*) as tournament_count,
          COUNT(DISTINCT g.id) as total_games,
          COUNT(DISTINCT tp.player_id) as total_players,
          ROUND(AVG(game_count), 1) as avg_games_per_tournament
        FROM tournaments t
        LEFT JOIN games g ON t.id = g.tournament_id
        LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
        LEFT JOIN (
          SELECT tournament_id, COUNT(*) as game_count
          FROM games 
          GROUP BY tournament_id
        ) gc ON t.id = gc.tournament_id
        GROUP BY t.game_type
        ORDER BY tournament_count DESC, total_games DESC
      `);

      // Game type activity over time (last 60 days)
      const gameTypeActivity = await pool.query(`
        SELECT 
          t.game_type,
          DATE_TRUNC('week', g.created_at) as week,
          COUNT(g.id) as games_played
        FROM games g
        JOIN tournaments t ON g.tournament_id = t.id
        WHERE g.created_at >= NOW() - INTERVAL '60 days'
        GROUP BY t.game_type, DATE_TRUNC('week', g.created_at)
        ORDER BY week DESC, games_played DESC
      `);

      res.json({
        popularGameTypes: popularGameTypes.rows,
        gameTypeActivity: gameTypeActivity.rows
      });
    } catch (error) {
      console.error('Error fetching game type analytics:', error);
      res.status(500).json({ message: 'Failed to fetch game type analytics' });
    }
  });

  // Social Gaming & Achievement System API Routes
  
  // Initialize default achievements
  app.post('/api/social/achievements/init', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await socialService.initializeDefaultAchievements();
      res.json({ message: 'Default achievements initialized successfully' });
    } catch (error) {
      console.error('Error initializing achievements:', error);
      res.status(500).json({ message: 'Failed to initialize achievements' });
    }
  });

  // Get all achievements
  app.get('/api/social/achievements', isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string;
      const achievements = await socialService.getAchievements(category);
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ message: 'Failed to fetch achievements' });
    }
  });

  // Generate tournament-specific achievements based on formula rules
  app.post('/api/social/achievements/generate/:tournamentId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      await socialService.generateFormulaBasedAchievements?.(tournamentId);
      res.json({ success: true, message: 'Dynamic achievements generated successfully' });
    } catch (error) {
      console.error('Error generating formula-based achievements:', error);
      res.status(500).json({ message: 'Failed to generate achievements' });
    }
  });

  // Get player achievements
  app.get('/api/social/players/:playerId/achievements', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string;
      const achievements = await socialService.getPlayerAchievements(playerId, tournamentId);
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching player achievements:', error);
      res.status(500).json({ message: 'Failed to fetch player achievements' });
    }
  });

  // Get tournament players with their achievements for competitive view
  app.get('/api/tournaments/players-achievements', isAuthenticated, async (req, res) => {
    try {
      const { tournamentId } = req.query;
      
      // Get all achievements with their unlock status by players in tournaments
      const playersWithAchievements = await storage.getPlayerAchievements('all', tournamentId as string);

      res.json(playersWithAchievements);
    } catch (error) {
      console.error('Error fetching tournament player achievements:', error);
      res.status(500).json({ message: 'Failed to fetch tournament player achievements' });
    }
  });

  // Check and unlock achievements for a player
  app.post('/api/social/players/:playerId/achievements/check', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const { tournamentId } = req.body;
      const newAchievements = await socialService.checkAchievements(playerId, tournamentId);
      res.json({ 
        message: `${newAchievements.length} new achievements unlocked`,
        achievements: newAchievements 
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
      res.status(500).json({ message: 'Failed to check achievements' });
    }
  });

  // Get player statistics
  app.get('/api/social/players/:playerId/stats', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string;
      const stats = await socialService.getPlayerStats(playerId, tournamentId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching player stats:', error);
      res.status(500).json({ message: 'Failed to fetch player stats' });
    }
  });

  // Get player rivalries
  app.get('/api/social/players/:playerId/rivalries', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string;
      const rivalries = await socialService.getPlayerRivalries(playerId, tournamentId);
      res.json(rivalries);
    } catch (error) {
      console.error('Error fetching player rivalries:', error);
      res.status(500).json({ message: 'Failed to fetch player rivalries' });
    }
  });

  // Get player performance insights
  app.get('/api/social/players/:playerId/insights', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string;
      const insights = await socialService.getPlayerInsights(playerId, tournamentId);
      res.json(insights);
    } catch (error) {
      console.error('Error fetching player insights:', error);
      res.status(500).json({ message: 'Failed to fetch player insights' });
    }
  });

  // Player Analytics API Routes
  app.get('/api/players/:playerId/analytics/insights', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string | undefined;
      const { playerAnalyticsService } = await import("./player-analytics-service");
      
      const insights = await playerAnalyticsService.calculatePerformanceInsights(playerId, tournamentId);
      res.json(insights);
    } catch (error: any) {
      console.error('Error fetching performance insights:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/players/:playerId/analytics/predictions/:opponentId', isAuthenticated, async (req, res) => {
    try {
      const { playerId, opponentId } = req.params;
      const tournamentId = req.query.tournamentId as string | undefined;
      const { playerAnalyticsService } = await import("./player-analytics-service");
      
      const prediction = await playerAnalyticsService.generateMatchPrediction(playerId, opponentId, tournamentId);
      res.json(prediction);
    } catch (error: any) {
      console.error('Error generating match prediction:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/players/:playerId/analytics/trends', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string | undefined;
      const { playerAnalyticsService } = await import("./player-analytics-service");
      
      const trends = await playerAnalyticsService.analyzeTrends(playerId, tournamentId);
      res.json(trends);
    } catch (error: any) {
      console.error('Error analyzing trends:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/players/:playerId/analytics/milestones', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string | undefined;
      const { playerAnalyticsService } = await import("./player-analytics-service");
      
      const milestones = await playerAnalyticsService.trackMilestones(playerId, tournamentId);
      res.json(milestones);
    } catch (error: any) {
      console.error('Error tracking milestones:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/players/:playerId/analytics/recommendations', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const tournamentId = req.query.tournamentId as string | undefined;
      const { playerAnalyticsService } = await import("./player-analytics-service");
      
      const recommendations = await playerAnalyticsService.generatePlayerRecommendations(playerId, tournamentId);
      res.json(recommendations);
    } catch (error: any) {
      console.error('Error generating player recommendations:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Social Features - Follow/Unfollow Players
  app.post('/api/social/players/:playerId/follow', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const followerId = req.user.id; // Current authenticated user
      
      const follow = await socialService.followPlayer(followerId, playerId);
      res.json({ message: 'Player followed successfully', follow });
    } catch (error) {
      console.error('Error following player:', error);
      res.status(500).json({ message: 'Failed to follow player' });
    }
  });

  app.delete('/api/social/players/:playerId/follow', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const followerId = req.user.id; // Current authenticated user
      
      await socialService.unfollowPlayer(followerId, playerId);
      res.json({ message: 'Player unfollowed successfully' });
    } catch (error) {
      console.error('Error unfollowing player:', error);
      res.status(500).json({ message: 'Failed to unfollow player' });
    }
  });

  // Get player followers
  app.get('/api/social/players/:playerId/followers', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const followers = await socialService.getPlayerFollowers(playerId);
      res.json(followers);
    } catch (error) {
      console.error('Error fetching followers:', error);
      res.status(500).json({ message: 'Failed to fetch followers' });
    }
  });

  // Get players that this player follows
  app.get('/api/social/players/:playerId/following', isAuthenticated, async (req, res) => {
    try {
      const { playerId } = req.params;
      const following = await socialService.getPlayerFollowing(playerId);
      res.json(following);
    } catch (error) {
      console.error('Error fetching following list:', error);
      res.status(500).json({ message: 'Failed to fetch following list' });
    }
  });

  // Tournament Highlights
  app.post('/api/social/tournaments/:tournamentId/highlights', isAuthenticated, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const createdBy = req.user.id; // Current authenticated user
      
      const highlight = await socialService.createTournamentHighlight({
        ...req.body,
        tournamentId,
        createdBy
      });
      
      res.json({ message: 'Tournament highlight created successfully', highlight });
    } catch (error) {
      console.error('Error creating tournament highlight:', error);
      res.status(500).json({ message: 'Failed to create tournament highlight' });
    }
  });

  app.get('/api/social/tournaments/:tournamentId/highlights', isAuthenticated, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const highlights = await socialService.getTournamentHighlights(tournamentId);
      res.json(highlights);
    } catch (error) {
      console.error('Error fetching tournament highlights:', error);
      res.status(500).json({ message: 'Failed to fetch tournament highlights' });
    }
  });

  // User Feedback API endpoints
  app.post("/api/feedback", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const feedbackData = {
        ...req.body,
        tournamentId: req.body.tournament_id, // Map frontend field to backend field
        userId: req.user.id,
        createdAt: new Date(),
        status: 'pending'
      };

      const feedback = await storage.createFeedback(feedbackData);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("❌ Failed to create feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/my-feedback", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get all feedback submitted by the current user
      const allFeedback = await storage.getAllFeedback();
      const userFeedback = allFeedback.filter(f => f.user_id === req.user.id);
      
      res.json(userFeedback);
    } catch (error) {
      console.error("❌ Failed to get user feedback:", error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  // Admin endpoint to get all feedback
  app.get("/api/feedback", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const allFeedback = await storage.getAllFeedback();
      res.json(allFeedback);
    } catch (error) {
      console.error("❌ Failed to get all feedback:", error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  // Admin endpoint to update feedback status
  app.patch("/api/feedback/:id", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'resolved'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'pending' or 'resolved'" });
      }

      const updatedFeedback = await storage.updateFeedbackStatus(id, status);
      res.json(updatedFeedback);
    } catch (error) {
      console.error("❌ Failed to update feedback status:", error);
      res.status(500).json({ message: "Failed to update feedback status" });
    }
  });

  // Email queue status endpoint
  app.get("/api/email-queue", isAuthenticated, async (req, res) => {
    try {
      const { getFallbackEmailService } = await import("./fallback-email-service");
      const fallbackService = getFallbackEmailService();
      const queue = fallbackService.getEmailQueue();
      res.json(queue);
    } catch (error: any) {
      console.error("Error fetching email queue:", error);
      res.status(500).json({ message: "Failed to fetch email queue" });
    }
  });

  // Email service configuration status
  app.get("/api/email-service-status", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const hasResendKey = !!process.env.RESEND_API_KEY;
      const validResendFormat = hasResendKey && process.env.RESEND_API_KEY.startsWith('re_');
      
      res.json({
        resend: {
          configured: hasResendKey,
          validFormat: validResendFormat,
          message: !hasResendKey ? "Resend API key not configured" : 
                  !validResendFormat ? "Resend API key format invalid (should start with re_)" :
                  "Resend properly configured"
        },
        activeService: validResendFormat ? "resend" : "fallback"
      });
    } catch (error: any) {
      console.error("Error checking email service status:", error);
      res.status(500).json({ message: "Failed to check email service status" });
    }
  });

  // Notification preferences endpoints
  app.get("/api/settings/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      const preferences = await storage.getNotificationPreferences(req.user!.id);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.post("/api/settings/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      console.log("📝 Updating notification preferences for user:", req.user!.id);
      console.log("📝 New preferences:", req.body);
      
      const updatedPreferences = await storage.updateNotificationPreferences(req.user!.id, req.body);
      
      console.log("✅ Preferences updated successfully:", updatedPreferences);
      res.json(updatedPreferences);
    } catch (error) {
      console.error("❌ Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Update Resend API key
  app.post("/api/email-service/configure", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || !apiKey.startsWith('re_')) {
        return res.status(400).json({ 
          message: "Invalid Resend API key format (should start with 're_')" 
        });
      }

      // In a production environment, you would securely store this
      // For now, we'll just validate the format
      res.json({
        message: "API key format validated. Please set RESEND_API_KEY environment variable.",
        validFormat: true
      });
    } catch (error: any) {
      console.error("Error configuring email service:", error);
      res.status(500).json({ message: "Failed to configure email service" });
    }
  });

  // Email API endpoints using Resend
  app.post("/api/emails/player-of-month", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { getResendEmailService } = await import('./resend-email-service');
      const { getFallbackEmailService } = await import('./fallback-email-service');
      
      const { to, playerData } = req.body;
      
      // Try Resend first
      const resendService = getResendEmailService();
      if (resendService) {
        const success = await resendService.sendPlayerOfTheMonth(to, playerData);
        if (success) {
          return res.json({ 
            message: "Player of the month email sent successfully via Resend", 
            service: "resend"
          });
        }
      }

      // Fallback to logging
      const fallbackService = getFallbackEmailService();
      const fallbackSuccess = await fallbackService.sendPlayerOfTheMonth(to, playerData);
      
      if (fallbackSuccess) {
        res.json({ 
          message: "Email queued for sending (Resend API key needed for delivery)", 
          service: "fallback"
        });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("❌ Failed to send player of month email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/emails/subscription-receipt", isAuthenticated, async (req, res) => {
    try {
      const { getSMTPEmailService } = await import('./smtp-email-service');
      const { getFallbackEmailService } = await import('./fallback-email-service');
      
      const { to, receiptData } = req.body;
      
      // Try SMTP first
      const smtpService = getSMTPEmailService();
      if (smtpService) {
        const success = await smtpService.sendSubscriptionReceipt(to, receiptData);
        if (success) {
          return res.json({ 
            message: "Subscription receipt sent successfully via SMTP", 
            service: "smtp"
          });
        }
      }

      // Fallback to logging
      const fallbackService = getFallbackEmailService();
      const success = await fallbackService.sendSubscriptionReceipt(to, receiptData);
      
      if (success) {
        res.json({ message: "Subscription receipt sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send receipt" });
      }
    } catch (error) {
      console.error("❌ Failed to send subscription receipt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/emails/upcoming-game", isAuthenticated, async (req, res) => {
    try {
      const { getProfessionalEmailService } = await import('./professional-email-service');
      const emailService = getProfessionalEmailService();
      
      if (!emailService) {
        return res.status(503).json({ message: "Email service not available" });
      }

      const { to, gameData } = req.body;
      const success = await emailService.sendUpcomingGame(to, gameData);
      
      if (success) {
        res.json({ message: "Upcoming game notification sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send notification" });
      }
    } catch (error) {
      console.error("❌ Failed to send upcoming game email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/emails/welcome", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { getProfessionalEmailService } = await import('./professional-email-service');
      const emailService = getProfessionalEmailService();
      
      if (!emailService) {
        return res.status(503).json({ message: "Email service not available" });
      }

      const { to, welcomeData } = req.body;
      const success = await emailService.sendWelcome(to, welcomeData);
      
      if (success) {
        res.json({ message: "Welcome email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send welcome email" });
      }
    } catch (error) {
      console.error("❌ Failed to send welcome email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/emails/tournament-announcement", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const { getProfessionalEmailService } = await import('./professional-email-service');
      const emailService = getProfessionalEmailService();
      
      if (!emailService) {
        return res.status(503).json({ message: "Email service not available" });
      }

      const { to, announcementData } = req.body;
      const success = await emailService.sendTournamentAnnouncement(to, announcementData);
      
      if (success) {
        res.json({ message: "Tournament announcement sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send announcement" });
      }
    } catch (error) {
      console.error("❌ Failed to send tournament announcement:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });



  // Test SMTP email functionality (legacy endpoint)
  app.post("/api/emails/smtp-test", async (req, res) => {
    try {
      const { getSMTPEmailService } = await import('./smtp-email-service');
      const { getFallbackEmailService } = await import('./fallback-email-service');
      
      const { to } = req.body;
      
      // Try SMTP first
      const smtpService = getSMTPEmailService();
      if (smtpService) {
        const success = await smtpService.sendTestEmail(to);
        if (success) {
          return res.json({ 
            message: "Test email sent successfully via SMTP", 
            service: "smtp"
          });
        }
      }

      // Fallback to logging
      const fallbackService = getFallbackEmailService();
      const fallbackSuccess = await fallbackService.sendTestEmail(to);
      
      if (fallbackSuccess) {
        res.json({ 
          message: "Email queued for sending (RESEND_API_KEY needed for delivery)", 
          service: "fallback"
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send test email", 
          service: "fallback"
        });
      }
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/my-tournaments", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get tournaments where user is a participant
      const userTournaments = await storage.getUserTournaments(req.user.id);
      res.json(userTournaments);
    } catch (error) {
      console.error("❌ Failed to get user tournaments:", error);
      res.status(500).json({ message: "Failed to retrieve tournaments" });
    }
  });

  // Update tournament settings
  app.patch("/api/tournaments/:id", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const updates = req.body;
      
      // Check if user has permission to update tournament
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check if user is tournament admin or app admin
      const isAppAdmin = req.user?.isAppAdmin;
      const tournamentPlayers = await storage.getTournamentPlayers(tournamentId);
      const userPlayer = tournamentPlayers.find(p => p.email === req.user?.email);
      const isTournamentAdmin = userPlayer?.isAdministrator;

      if (!isAppAdmin && !isTournamentAdmin) {
        return res.status(403).json({ message: "Insufficient permissions to update tournament" });
      }

      // Process date fields if they exist
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }

      const updatedTournament = await storage.updateTournament(tournamentId, updates);
      res.json(updatedTournament);
    } catch (error) {
      console.error("❌ Failed to update tournament:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  // Get formulas for a tournament
  app.get("/api/tournaments/:id/formulas", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const formulas = await storage.getLeaderboardFormulas(tournamentId);
      res.json(formulas);
    } catch (error) {
      console.error("❌ Failed to get tournament formulas:", error);
      res.status(500).json({ message: "Failed to get tournament formulas" });
    }
  });

  // Create new formula
  app.post("/api/formulas", isAuthenticated, async (req, res) => {
    try {
      const formulaData = {
        ...req.body,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };

      const formula = await storage.createLeaderboardFormula(formulaData);
      res.status(201).json(formula);
    } catch (error) {
      console.error("❌ Failed to create formula:", error);
      res.status(500).json({ message: "Failed to create formula" });
    }
  });

  // Update formula
  app.patch("/api/formulas/:id", isAuthenticated, async (req, res) => {
    try {
      const formulaId = req.params.id;
      const updates = req.body;

      const updatedFormula = await storage.updateLeaderboardFormula(formulaId, updates);
      if (!updatedFormula) {
        return res.status(404).json({ message: "Formula not found" });
      }

      res.json(updatedFormula);
    } catch (error) {
      console.error("❌ Failed to update formula:", error);
      res.status(500).json({ message: "Failed to update formula" });
    }
  });

  // Delete formula
  app.delete("/api/formulas/:id", isAuthenticated, async (req, res) => {
    try {
      const formulaId = req.params.id;

      const success = await storage.deleteLeaderboardFormula(formulaId);
      if (!success) {
        return res.status(404).json({ message: "Formula not found" });
      }

      res.json({ message: "Formula deleted successfully" });
    } catch (error) {
      console.error("❌ Failed to delete formula:", error);
      res.status(500).json({ message: "Failed to delete formula" });
    }
  });

  // Tournament admin feedback routes
  app.get("/api/tournaments/:tournamentId/feedback", isAuthenticated, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      
      // Check if user has admin access to this tournament
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament || tournament.created_by !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const feedback = await storage.getFeedbackByTournament(tournamentId);
      res.json(feedback);
    } catch (error) {
      console.error("❌ Failed to get tournament feedback:", error);
      res.status(500).json({ message: "Failed to retrieve feedback" });
    }
  });

  // Subscription renewal endpoint
  app.post("/api/subscription/create-renewal-intent", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionType, amount, currency } = req.body;
      
      console.log("💰 Creating payment intent with data:", {
        subscriptionType,
        amount,
        currency,
        userId: req.user?.id
      });
      
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount should already be in cents
        currency: currency.toLowerCase(),
        metadata: {
          userId: req.user.id,
          subscriptionType: subscriptionType,
          renewalType: 'subscription_renewal'
        }
      });

      console.log("💰 Payment intent created:", {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating renewal payment intent:', error);
      res.status(500).json({ 
        message: "Error creating renewal payment intent: " + error.message 
      });
    }
  });

  // Global pricing endpoint for client
  app.get("/api/global-pricing", async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM subscription_pricing ORDER BY currency_code');
      const pricingData = result.rows;
      
      // Transform to expected format
      const response: any = {};
      pricingData.forEach(row => {
        const currency = row.currency_code.toLowerCase();
        const currencyKey = currency.charAt(0).toUpperCase() + currency.slice(1);
        response[`monthlyPrice${currencyKey}`] = row.monthly_price;
        response[`annualPrice${currencyKey}`] = row.annual_price;
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error getting global pricing:", error);
      res.status(500).json({ message: "Failed to get pricing" });
    }
  });

  // Handle subscription renewal completion
  app.post("/api/subscription/complete-renewal", async (req, res) => {
    try {
      const { paymentIntentId, subscriptionType } = req.body;
      
      console.log("🔄 Completing subscription renewal:", { paymentIntentId, subscriptionType });
      
      // Verify payment with Stripe and get user ID from metadata
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not successful" });
      }

      // Get user ID from payment intent metadata (more reliable than session)
      const userId = paymentIntent.metadata.userId;
      const metadataSubscriptionType = paymentIntent.metadata.subscriptionType;
      
      if (!userId) {
        console.error("❌ No user ID found in payment intent metadata");
        return res.status(400).json({ message: "Invalid payment intent - no user ID" });
      }

      console.log("🔄 Using user ID from payment metadata:", userId);
      console.log("🔄 Subscription type from metadata:", metadataSubscriptionType);

      // Use subscription type from metadata if not provided in request
      const finalSubscriptionType = subscriptionType || metadataSubscriptionType;

      // Get current user subscription to calculate proper end date
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate subscription end date - extend from current expiry or start from now
      const now = new Date();
      let startDate = now;
      
      // If user has active subscription, extend from current expiry date
      if (currentUser.subscriptionValidUntil) {
        const currentExpiry = new Date(currentUser.subscriptionValidUntil);
        // If current subscription is still valid, extend from expiry date
        // If expired, start from current date
        if (currentExpiry > now) {
          startDate = currentExpiry;
        }
      }
      
      const endDate = new Date(startDate);
      
      if (finalSubscriptionType === 'monthly') {
        endDate.setMonth(startDate.getMonth() + 1);
      } else if (finalSubscriptionType === 'annual') {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }

      console.log("🔄 Subscription renewal calculation:");
      console.log("🔄 Current expiry:", currentUser.subscriptionValidUntil);
      console.log("🔄 Start date for extension:", startDate.toISOString());
      console.log("🔄 New end date:", endDate.toISOString());

      // Update user subscription
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'active',
        subscriptionType: finalSubscriptionType,
        subscriptionEndDate: endDate,
        paymentIntentId: paymentIntentId
      });

      // Send subscription renewal receipt email
      try {
        if (currentUser.email && emailService) {
          const receiptData = {
            playerName: currentUser.name,
            email: currentUser.email,
            subscriptionType: finalSubscriptionType as 'monthly' | 'annual',
            amount: (paymentIntent.amount / 100).toFixed(2),
            currency: paymentIntent.currency.toUpperCase(),
            paymentDate: new Date().toLocaleDateString(),
            nextBillingDate: endDate.toLocaleDateString(),
            transactionId: paymentIntentId,
            invoiceNumber: `INV-${Date.now()}`,
            companyName: 'WynnrZ Tournament Management',
            companyAddress: '123 Gaming Street, Tournament City, TC 12345'
          };
          
          await emailService.sendSubscriptionReceipt(currentUser.email, receiptData);
          console.log(`📧 Subscription receipt sent to ${currentUser.email}`);
        }
      } catch (emailError) {
        console.warn('⚠️ Failed to send subscription receipt email:', emailError);
        // Don't fail the main operation if email fails
      }

      res.json({ 
        message: "Subscription renewed successfully",
        subscriptionEndDate: endDate,
        subscriptionType: finalSubscriptionType
      });
    } catch (error: any) {
      console.error("❌ Error completing subscription renewal:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        paymentIntentId: req.body.paymentIntentId,
        subscriptionType: req.body.subscriptionType
      });
      res.status(500).json({ 
        message: "Failed to complete subscription renewal", 
        error: error.message 
      });
    }
  });

  // Live Analytics API endpoints
  app.get("/api/analytics/system", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // Get most active players across all tournaments
      const mostActiveUsersQuery = `
        SELECT 
          p.name as player_name,
          COUNT(DISTINCT tp.tournament_id) as tournament_count,
          COUNT(gp.id) as total_games,
          SUM(CASE WHEN gp.is_winner = true THEN 1 ELSE 0 END) as wins
        FROM players p
        JOIN tournament_players tp ON p.id = tp.player_id
        LEFT JOIN game_participants gp ON p.id = gp.player_id
        GROUP BY p.id, p.name
        HAVING COUNT(gp.id) > 0
        ORDER BY total_games DESC, wins DESC
        LIMIT 10
      `;

      // Get most active tournaments
      const mostActiveTournamentsQuery = `
        SELECT 
          t.name,
          t.game_type,
          COUNT(DISTINCT g.id) as game_count,
          COUNT(DISTINCT tp.player_id) as player_count,
          t.created_at
        FROM tournaments t
        LEFT JOIN games g ON t.id = g.tournament_id
        LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
        WHERE t.is_active = true
        GROUP BY t.id, t.name, t.game_type, t.created_at
        ORDER BY game_count DESC, player_count DESC
        LIMIT 10
      `;

      // Get recent activity
      const recentActivityQuery = `
        SELECT 
          COUNT(DISTINCT g.id) as recent_games,
          COUNT(DISTINCT t.id) as active_tournaments,
          COUNT(DISTINCT p.id) as active_players
        FROM games g
        JOIN tournaments t ON g.tournament_id = t.id
        JOIN game_participants gp ON g.id = gp.game_id
        JOIN players p ON gp.player_id = p.id
        WHERE g.date >= NOW() - INTERVAL '30 days'
      `;

      const [mostActiveUsers, mostActiveTournaments, recentActivity] = await Promise.all([
        pool.query(mostActiveUsersQuery),
        pool.query(mostActiveTournamentsQuery),
        pool.query(recentActivityQuery)
      ]);

      res.json({
        mostActiveUsers: mostActiveUsers.rows,
        mostActiveTournaments: mostActiveTournaments.rows,
        recentActivity: recentActivity.rows[0] || {}
      });
    } catch (error) {
      console.error("Error fetching system analytics:", error);
      res.status(500).json({ message: "Failed to fetch system analytics" });
    }
  });

  // Global Controls analytics endpoint
  app.get("/api/analytics/global-controls", isAuthenticated, isAppAdmin, async (req, res) => {
    try {
      // Get total users count
      const totalUsersQuery = `SELECT COUNT(*) as total_users FROM users`;
      
      // Get active tournaments count
      const activeTournamentsQuery = `SELECT COUNT(*) as active_tournaments FROM tournaments WHERE is_active = true`;
      
      // Get total games count
      const totalGamesQuery = `SELECT COUNT(*) as total_games FROM games`;
      
      // Get subscription stats
      const subscriptionStatsQuery = `
        SELECT 
          subscription_status,
          COUNT(*) as count
        FROM users 
        WHERE subscription_status IS NOT NULL
        GROUP BY subscription_status
      `;

      // User registration trends (last 8 weeks)
      const registrationTrendsQuery = `
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC
      `;

      // Peak usage times (games by hour of day in last 30 days)
      const peakUsageQuery = `
        SELECT 
          EXTRACT(hour FROM date) as hour_of_day,
          COUNT(*) as games_count
        FROM games
        WHERE date >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(hour FROM date)
        ORDER BY games_count DESC
        LIMIT 5
      `;

      // Player retention metrics
      const retentionMetricsQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN last_game >= NOW() - INTERVAL '7 days' THEN p.id END) as active_last_7_days,
          COUNT(DISTINCT CASE WHEN last_game >= NOW() - INTERVAL '30 days' THEN p.id END) as active_last_30_days,
          COUNT(DISTINCT p.id) as total_players
        FROM players p
        LEFT JOIN (
          SELECT 
            gp.player_id,
            MAX(g.date) as last_game
          FROM game_participants gp
          JOIN games g ON gp.game_id = g.id
          GROUP BY gp.player_id
        ) lg ON p.id = lg.player_id
      `;

      const [
        totalUsers,
        activeTournaments,
        totalGames,
        subscriptionStats,
        registrationTrends,
        peakUsage,
        retentionMetrics
      ] = await Promise.all([
        pool.query(totalUsersQuery),
        pool.query(activeTournamentsQuery),
        pool.query(totalGamesQuery),
        pool.query(subscriptionStatsQuery),
        pool.query(registrationTrendsQuery),
        pool.query(peakUsageQuery),
        pool.query(retentionMetricsQuery)
      ]);

      res.json({
        registeredUsers: parseInt(totalUsers.rows[0]?.total_users || 0),
        activeTournaments: parseInt(activeTournaments.rows[0]?.active_tournaments || 0),
        totalGames: parseInt(totalGames.rows[0]?.total_games || 0),
        subscriptionStats: subscriptionStats.rows,
        registrationTrends: registrationTrends.rows,
        peakUsage: peakUsage.rows,
        retentionMetrics: retentionMetrics.rows[0] || {}
      });
    } catch (error) {
      console.error("Error fetching global controls analytics:", error);
      res.status(500).json({ message: "Failed to fetch global controls analytics" });
    }
  });

  // Player Analytics API Endpoints
  app.get("/api/analytics/player", isAuthenticated, async (req, res) => {
    try {
      const playerId = req.user!.id;

      // Get basic player statistics
      const playerStats = await db.select({
        totalGames: sql<number>`COUNT(*)`,
        wins: sql<number>`SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)`,
        losses: sql<number>`COUNT(*) - SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)`,
        draws: sql<number>`0`,
        totalScore: sql<number>`SUM(${gameParticipants.score})`,
        bestScore: sql<number>`MAX(${gameParticipants.score})`
      })
      .from(gameParticipants)
      .where(eq(gameParticipants.playerId, playerId));

      const stats = playerStats[0] || { totalGames: 0, wins: 0, losses: 0, draws: 0, totalScore: 0, bestScore: 0 };
      
      // Calculate derived metrics
      const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
      const averageScore = stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames) : 0;

      // Get recent games with opponent information
      const recentGames = await db.select({
        gameId: games.id,
        gameDate: games.date,
        tournamentName: tournaments.name,
        outcome: sql<string>`CASE WHEN ${gameParticipants.isWinner} = true THEN 'win' ELSE 'loss' END`,
        playerScore: gameParticipants.score,
        opponentScore: sql<number>`(
          SELECT ${gameParticipants.score} 
          FROM ${gameParticipants} 
          WHERE ${gameParticipants.gameId} = ${games.id} 
          AND ${gameParticipants.playerId} != ${playerId}
          LIMIT 1
        )`,
        opponent: sql<string>`(
          SELECT ${users.name} 
          FROM ${gameParticipants} 
          JOIN ${users} ON ${gameParticipants.playerId} = ${users.id}
          WHERE ${gameParticipants.gameId} = ${games.id} 
          AND ${gameParticipants.playerId} != ${playerId}
          LIMIT 1
        )`
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .innerJoin(tournaments, eq(games.tournamentId, tournaments.id))
      .where(eq(gameParticipants.playerId, playerId))
      .orderBy(desc(games.date))
      .limit(15);

      // Get head-to-head records
      const headToHeadRecords = await db.select({
        opponentId: sql<string>`opponent_stats.opponent_id`,
        opponentName: sql<string>`opponent_stats.opponent_name`,
        totalGames: sql<number>`opponent_stats.total_games`,
        wins: sql<number>`opponent_stats.wins`,
        losses: sql<number>`opponent_stats.losses`,
        winRate: sql<number>`ROUND((opponent_stats.wins::numeric / opponent_stats.total_games) * 100, 1)`
      })
      .from(sql`(
        SELECT 
          opponent_participants.player_id as opponent_id,
          opponent_users.name as opponent_name,
          COUNT(*) as total_games,
          SUM(CASE WHEN player_participants.is_winner = true THEN 1 ELSE 0 END) as wins,
          COUNT(*) - SUM(CASE WHEN player_participants.is_winner = true THEN 1 ELSE 0 END) as losses
        FROM ${gameParticipants} player_participants
        JOIN ${games} ON player_participants.game_id = ${games.id}
        JOIN ${gameParticipants} opponent_participants ON ${games.id} = opponent_participants.game_id
        JOIN ${users} opponent_users ON opponent_participants.player_id = opponent_users.id
        WHERE player_participants.player_id = ${playerId}
        AND opponent_participants.player_id != ${playerId}
        GROUP BY opponent_participants.player_id, opponent_users.name
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) as opponent_stats`);

      // Get performance by game type
      const performanceByGameType = await db.select({
        gameType: tournaments.gameType,
        totalGames: sql<number>`COUNT(*)`,
        wins: sql<number>`SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)`,
        losses: sql<number>`COUNT(*) - SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)`,
        winRate: sql<number>`ROUND((SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)`
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .innerJoin(tournaments, eq(games.tournamentId, tournaments.id))
      .where(eq(gameParticipants.playerId, playerId))
      .groupBy(tournaments.gameType)
      .orderBy(sql`COUNT(*) DESC`);

      // Calculate current win streak
      const recentOutcomes = recentGames.map(g => g.outcome).slice(0, 10);
      let currentStreak = 0;
      for (const outcome of recentOutcomes) {
        if (outcome === 'win') {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate best win streak
      let bestWinStreak = 0;
      let tempStreak = 0;
      const allOutcomes = await db.select({
        isWinner: gameParticipants.isWinner
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(eq(gameParticipants.playerId, playerId))
      .orderBy(games.date);

      for (const game of allOutcomes) {
        if (game.isWinner) {
          tempStreak++;
          bestWinStreak = Math.max(bestWinStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      res.json({
        winRate,
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        averageScore,
        bestScore: stats.bestScore,
        currentStreak,
        bestWinStreak,
        recentGames: recentGames.map(game => ({
          ...game,
          gameDate: game.gameDate.toISOString()
        })),
        headToHeadRecords,
        performanceByGameType
      });
    } catch (error) {
      console.error('Error fetching player analytics:', error);
      res.status(500).json({ error: 'Failed to fetch player analytics' });
    }
  });

  app.get("/api/analytics/player/trends", isAuthenticated, async (req, res) => {
    try {
      const playerId = req.user!.id;

      // Get monthly performance trends (last 6 months)
      const monthlyStats = await db.select({
        month: sql<string>`TO_CHAR(${games.date}, 'YYYY-MM')`,
        monthName: sql<string>`TO_CHAR(${games.date}, 'Month YYYY')`,
        totalGames: sql<number>`COUNT(*)`,
        wins: sql<number>`SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)`,
        winRate: sql<number>`ROUND((SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)`
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(and(
        eq(gameParticipants.playerId, playerId),
        gte(games.date, sql`NOW() - INTERVAL '6 months'`)
      ))
      .groupBy(sql`TO_CHAR(${games.date}, 'YYYY-MM')`, sql`TO_CHAR(${games.date}, 'Month YYYY')`)
      .orderBy(sql`TO_CHAR(${games.date}, 'YYYY-MM') DESC`)
      .limit(6);

      // Generate improvement suggestions based on performance
      const improvementAreas = [];
      const strengths = [];

      // Get player's overall stats for analysis
      const overallStats = await db.select({
        totalGames: sql<number>`COUNT(*)`,
        winRate: sql<number>`ROUND((SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)`,
        avgScore: sql<number>`ROUND(AVG(${gameParticipants.score}), 1)`
      })
      .from(gameParticipants)
      .where(eq(gameParticipants.playerId, playerId));

      const playerStats = overallStats[0];

      if (playerStats) {
        // Analysis for improvement areas
        if (playerStats.winRate < 50) {
          improvementAreas.push({
            area: "Win Rate Improvement",
            suggestion: "Focus on strategic play and analyzing opponent patterns to improve your win percentage.",
            statistic: `Current win rate: ${playerStats.winRate}%`
          });
        }

        if (playerStats.avgScore < 15) {
          improvementAreas.push({
            area: "Scoring Consistency",
            suggestion: "Work on maintaining consistent scoring patterns throughout matches.",
            statistic: `Average score: ${playerStats.avgScore}`
          });
        }

        if (monthlyStats.length >= 2) {
          const recentMonth = monthlyStats[0];
          const previousMonth = monthlyStats[1];
          if (recentMonth.winRate < previousMonth.winRate) {
            improvementAreas.push({
              area: "Recent Performance Decline",
              suggestion: "Review recent matches to identify areas for tactical improvements.",
              statistic: `Win rate dropped from ${previousMonth.winRate}% to ${recentMonth.winRate}%`
            });
          }
        }

        // Analysis for strengths
        if (playerStats.winRate >= 70) {
          strengths.push({
            area: "Excellent Win Rate",
            description: "You maintain a strong winning percentage across matches.",
            statistic: `Win rate: ${playerStats.winRate}%`
          });
        }

        if (playerStats.avgScore >= 20) {
          strengths.push({
            area: "High Scoring Performance",
            description: "You consistently achieve high scores in your matches.",
            statistic: `Average score: ${playerStats.avgScore}`
          });
        }

        if (playerStats.totalGames >= 50) {
          strengths.push({
            area: "Active Player",
            description: "You're highly engaged and regularly participate in tournaments.",
            statistic: `Total games played: ${playerStats.totalGames}`
          });
        }
      }

      res.json({
        monthlyStats: monthlyStats.map(stat => ({
          ...stat,
          month: stat.monthName
        })),
        improvementAreas,
        strengths
      });
    } catch (error) {
      console.error('Error fetching player trends:', error);
      res.status(500).json({ error: 'Failed to fetch player trends' });
    }
  });

  app.get("/api/analytics/player/rankings", isAuthenticated, async (req, res) => {
    try {
      const playerId = req.user!.id;

      // Get player's tournament rankings
      const tournamentRankings = await db.select({
        tournamentId: tournaments.id,
        tournamentName: tournaments.name,
        gameType: tournaments.gameType,
        playerStats: sql<any>`json_build_object(
          'total_games', COUNT(${gameParticipants.id}),
          'wins', SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END),
          'losses', COUNT(*) - SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END),
          'points', SUM(${gameParticipants.score}),
          'win_rate', ROUND((SUM(CASE WHEN ${gameParticipants.isWinner} = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
        )`
      })
      .from(tournaments)
      .innerJoin(games, eq(tournaments.id, games.tournamentId))
      .innerJoin(gameParticipants, eq(games.id, gameParticipants.gameId))
      .where(and(
        eq(gameParticipants.playerId, playerId),
        eq(tournaments.isActive, true)
      ))
      .groupBy(tournaments.id, tournaments.name, tournaments.gameType)
      .orderBy(sql`SUM(${gameParticipants.score}) DESC`);

      // Calculate positions within each tournament
      const rankingsWithPositions = [];
      
      for (const ranking of tournamentRankings) {
        // Get all players' scores in this tournament to calculate position
        const allPlayersInTournament = await db.select({
          playerId: gameParticipants.playerId,
          totalPoints: sql<number>`SUM(${gameParticipants.score})`
        })
        .from(gameParticipants)
        .innerJoin(games, eq(gameParticipants.gameId, games.id))
        .where(eq(games.tournamentId, ranking.tournamentId))
        .groupBy(gameParticipants.playerId)
        .orderBy(sql`SUM(${gameParticipants.score}) DESC`);

        const playerPosition = allPlayersInTournament.findIndex(p => p.playerId === playerId) + 1;

        rankingsWithPositions.push({
          tournamentName: ranking.tournamentName,
          gameType: ranking.gameType,
          position: playerPosition,
          totalPlayers: allPlayersInTournament.length,
          points: ranking.playerStats.points,
          wins: ranking.playerStats.wins,
          losses: ranking.playerStats.losses,
          totalGames: ranking.playerStats.total_games,
          winRate: ranking.playerStats.win_rate
        });
      }

      res.json(rankingsWithPositions);
    } catch (error) {
      console.error('Error fetching player rankings:', error);
      res.status(500).json({ error: 'Failed to fetch player rankings' });
    }
  });

  // Player targets endpoints
  app.get("/api/analytics/player/targets", isAuthenticated, async (req, res) => {
    try {
      const playerId = req.user!.id;
      
      // For now, return empty array since we don't have a targets table yet
      // This prevents the frontend error
      res.json([]);
    } catch (error) {
      console.error('Error fetching player targets:', error);
      res.status(500).json({ error: 'Failed to fetch player targets' });
    }
  });

  app.post("/api/analytics/player/targets", isAuthenticated, async (req, res) => {
    try {
      const playerId = req.user!.id;
      const { metric, value, description } = req.body;
      
      // For now, just return success since we don't have a targets table yet
      // This prevents the frontend error
      res.json({ 
        id: Date.now().toString(),
        playerId,
        metric,
        targetValue: value,
        currentValue: 0,
        description,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating player target:', error);
      res.status(500).json({ error: 'Failed to create player target' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
