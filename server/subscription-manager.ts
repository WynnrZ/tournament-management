import { storage } from "./storage";
// import { MailService } from '@sendgrid/mail'; // Temporarily disabled

interface SubscriptionStatus {
  playerId: string;
  playerName: string;
  email: string;
  subscriptionStatus: string;
  trialEndDate: Date | null;
  subscriptionEndDate: Date | null;
  daysUntilExpiry: number;
  isExpired: boolean;
  needsWarning: boolean;
}

export class SubscriptionManager {
  private mailService: any | null = null; // Temporarily disabled

  constructor() {
    // Temporarily disabled to prevent JSON parsing errors
    console.log('Email notifications temporarily disabled');
  }

  /**
   * Check all players for subscription status and identify those needing warnings
   */
  async checkAllSubscriptions(): Promise<SubscriptionStatus[]> {
    const players = await storage.getPlayers();
    const subscriptionStatuses: SubscriptionStatus[] = [];

    for (const player of players) {
      const status = this.calculateSubscriptionStatus(player);
      subscriptionStatuses.push(status);
    }

    return subscriptionStatuses;
  }

  /**
   * Calculate subscription status for a single player
   */
  calculateSubscriptionStatus(player: any): SubscriptionStatus {
    const now = new Date();
    
    // Grandfathering rule: Players created before 2025 are exempt from subscriptions
    const playerCreated = new Date(player.created_at);
    const isGrandfathered = playerCreated.getFullYear() < 2025;
    
    console.log("🔔 Subscription Check for", player.name);
    console.log("🔔 Created:", playerCreated.toISOString());
    console.log("🔔 Is Grandfathered:", isGrandfathered);
    
    if (isGrandfathered) {
      return {
        subscriptionStatus: 'grandfathered',
        isExpired: false,
        needsWarning: false,
        daysUntilExpiry: Infinity,
        trialEndDate: null,
        subscriptionEndDate: null
      };
    }
    
    // For players with subscription_valid_until (3-month trial)
    let trialEndDate = null;
    if (player.subscription_valid_until) {
      trialEndDate = new Date(player.subscription_valid_until);
    } else if (player.subscription_start_date) {
      // Fallback to subscription_start_date + 90 days
      trialEndDate = new Date(new Date(player.subscription_start_date).getTime() + (90 * 24 * 60 * 60 * 1000));
    }
    
    const subscriptionEndDate = player.subscription_end_date 
      ? new Date(player.subscription_end_date)
      : null;

    // Determine which date to use for expiry calculation
    let expiryDate = subscriptionEndDate;
    if ((player.subscription_status === 'trial' || player.subscription_status === 'free_trial') && trialEndDate) {
      expiryDate = trialEndDate;
    }

    const daysUntilExpiry = expiryDate 
      ? Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : Infinity;

    const isExpired = daysUntilExpiry <= 0;
    
    console.log("🔔 Trial Start Date:", player.subscription_start_date);
    console.log("🔔 Trial End Date:", trialEndDate?.toISOString());
    console.log("🔔 Days Until Expiry:", daysUntilExpiry);
    console.log("🔔 Is Expired:", isExpired);
    const needsWarning = daysUntilExpiry <= 7 && daysUntilExpiry > 0; // Warning 1 week before

    return {
      playerId: player.id,
      playerName: player.name,
      email: player.email,
      subscriptionStatus: player.subscription_status || 'trial',
      trialEndDate,
      subscriptionEndDate,
      daysUntilExpiry: daysUntilExpiry === Infinity ? -1 : daysUntilExpiry,
      isExpired,
      needsWarning
    };
  }

  /**
   * Get subscription status for a specific player
   */
  async getPlayerSubscriptionStatus(playerId: string): Promise<SubscriptionStatus | null> {
    console.log("🔔 Looking for player with ID:", playerId);
    // Handle both string and numeric IDs
    let player;
    if (isNaN(parseInt(playerId))) {
      // String ID - search by ID directly
      const players = await storage.getPlayers();
      player = players.find(p => p.id === playerId);
    } else {
      // Numeric ID - use getPlayer
      player = await storage.getPlayer(parseInt(playerId));
    }
    console.log("🔔 Found player:", player ? player.name : "NOT FOUND");
    if (!player) return null;

    return this.calculateSubscriptionStatus(player);
  }

  /**
   * Send warning email to player about upcoming subscription expiry
   */
  async sendWarningEmail(subscriptionStatus: SubscriptionStatus): Promise<boolean> {
    // Email service temporarily disabled
    console.log(`📧 Email service disabled - would send warning to ${subscriptionStatus.playerName}`);
    return false;

    const isTrialExpiring = subscriptionStatus.subscriptionStatus === 'trial';
    const subject = isTrialExpiring 
      ? 'Your Free Trial is Ending Soon'
      : 'Your Subscription is Expiring Soon';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Subscription Notice</h2>
        
        <p>Hello ${subscriptionStatus.playerName},</p>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">
            ${isTrialExpiring ? '🕐 Trial Ending Soon' : '📅 Subscription Expiring'}
          </h3>
          <p style="color: #92400e; margin-bottom: 0;">
            Your ${isTrialExpiring ? 'free trial' : 'subscription'} will expire in 
            <strong>${subscriptionStatus.daysUntilExpiry} day${subscriptionStatus.daysUntilExpiry === 1 ? '' : 's'}</strong>.
          </p>
        </div>

        ${isTrialExpiring ? `
          <p>Your free trial has been giving you access to all tournament features. To continue enjoying:</p>
          <ul>
            <li>Unlimited tournament participation</li>
            <li>Advanced leaderboard analytics</li>
            <li>Team management tools</li>
            <li>Performance tracking</li>
          </ul>
        ` : `
          <p>Don't let your tournament access expire! Renew your subscription to continue accessing all features.</p>
        `}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/settings" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ${isTrialExpiring ? 'Upgrade Now' : 'Renew Subscription'}
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Questions? Contact our support team or visit your account settings to manage your subscription.
        </p>
      </div>
    `;

    try {
      await this.mailService.send({
        to: subscriptionStatus.email,
        from: process.env.FROM_EMAIL || 'noreply@wynnrz.com',
        subject,
        html: htmlContent,
      });

      console.log(`📧 Warning email sent successfully to ${subscriptionStatus.playerName} (${subscriptionStatus.email})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send warning email to ${subscriptionStatus.playerName}:`, error);
      return false;
    }
  }

  /**
   * Process all subscriptions and send warning emails
   */
  async processSubscriptionWarnings(): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.checkAllSubscriptions();
    const needingWarnings = subscriptions.filter(s => s.needsWarning);

    let sent = 0;
    let failed = 0;

    for (const subscription of needingWarnings) {
      const success = await this.sendWarningEmail(subscription);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`📊 Subscription warnings processed: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Deactivate expired players by updating their subscription status
   */
  async deactivateExpiredPlayers(): Promise<string[]> {
    const subscriptions = await this.checkAllSubscriptions();
    const expiredPlayers = subscriptions.filter(s => s.isExpired);
    const deactivatedPlayerIds: string[] = [];

    for (const subscription of expiredPlayers) {
      try {
        await storage.updatePlayer(parseInt(subscription.playerId), {
          subscription_status: 'expired'
        });
        deactivatedPlayerIds.push(subscription.playerId);
        console.log(`🚫 Deactivated expired player: ${subscription.playerName}`);
      } catch (error) {
        console.error(`❌ Failed to deactivate player ${subscription.playerName}:`, error);
      }
    }

    return deactivatedPlayerIds;
  }

  /**
   * Get players with active subscriptions (not expired)
   */
  async getActiveSubscriptionPlayers(): Promise<any[]> {
    const players = await storage.getPlayers();
    const activePlayers = [];

    for (const player of players) {
      const status = this.calculateSubscriptionStatus(player);
      if (!status.isExpired) {
        activePlayers.push(player);
      }
    }

    return activePlayers;
  }
}

export const subscriptionManager = new SubscriptionManager();