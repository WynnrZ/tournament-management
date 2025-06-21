import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { users, tournaments, players, teams, teamMembers, games, gameParticipants, tournamentPlayers, leaderboardFormulas, feedback, feedbackResponses, biometricCredentials } from "@shared/schema";
import type { InsertLeaderboardFormula, LeaderboardFormula } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { nanoid } from "nanoid";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Core methods
  getTournaments(): Promise<any[]>;
  getTournament(id: string): Promise<any>;
  getTournamentPlayers(tournamentId: string): Promise<any[]>;
  getGames(tournamentId?: string): Promise<any[]>;
  getGame(id: string): Promise<any>;
  getGameParticipants(gameId: string): Promise<any[]>;
  createGame(game: any, participants: any[]): Promise<any>;
  
  // Players & Teams
  getPlayers(): Promise<any[]>;
  getPlayer(id: string): Promise<any>;
  createPlayer(player: any): Promise<any>;
  updatePlayer(id: string, player: any): Promise<any>;
  deletePlayer(id: string): Promise<boolean>;
  addPlayerToTournament(data: any): Promise<any>;
  removePlayerFromTournament(tournamentId: string, playerId: string): Promise<boolean>;
  updateTournamentPlayerPermissions(tournamentId: string, playerId: string, permissions: any): Promise<any>;
  
  getTeams(tournamentId: string): Promise<any[]>;
  getTeam(id: string): Promise<any>;
  createTeam(team: any): Promise<any>;
  updateTeam(id: string, team: any): Promise<any>;
  deleteTeam(id: string): Promise<boolean>;
  addPlayerToTeam(data: any): Promise<any>;
  removePlayerFromTeam(teamId: string, playerId: string): Promise<boolean>;
  getTeamMembers(teamId: string): Promise<any[]>;
  
  // Tournaments
  createTournament(tournament: any): Promise<any>;
  updateTournament(id: string, tournament: any): Promise<any>;
  deleteTournament(id: string): Promise<boolean>;
  getUserTournaments(userId: string): Promise<any[]>;
  
  // Formulas
  getLeaderboardFormulas(tournamentId: string): Promise<any[]>;
  getAllLeaderboardFormulas(): Promise<any[]>;
  getLeaderboardFormula(id: string): Promise<any>;
  createLeaderboardFormula(formula: any): Promise<any>;
  updateLeaderboardFormula(id: string, formula: any): Promise<any>;
  deleteLeaderboardFormula(id: string): Promise<boolean>;
  
  // Feedback
  createFeedback(feedback: any): Promise<any>;
  getFeedbackByTournament(tournamentId: string): Promise<any[]>;
  getAllFeedback(): Promise<any[]>;
  updateFeedbackStatus(id: string, status: string): Promise<any>;
  createFeedbackResponse(response: any): Promise<any>;
  getFeedbackResponses(feedbackId: string): Promise<any[]>;
  
  // Users & Auth
  getUser(id: any): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(user: any): Promise<any>;
  updateUser(id: any, user: any): Promise<any>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  
  // Password Reset
  createPasswordResetToken(token: any): Promise<any>;
  getPasswordResetToken(token: string): Promise<any>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  
  // Stats
  getActiveTournamentsCount(): Promise<number>;
  getTotalGamesCount(): Promise<number>;
  getTotalPlayersCount(): Promise<number>;
  
  // Admin
  getAdminActivityLogs(): Promise<any[]>;
  logAdminActivity(log: any): Promise<any>;
  
  // Social Features
  getActivityFeed(params: { tournamentId?: string; playerId?: string; limit: number }): Promise<any[]>;
  toggleActivityLike(activityId: string, userId: string): Promise<any>;
  
  // Biometric Authentication
  storeBiometricCredential(credential: { userId: string; credentialId: string; publicKey: string; counter: number }): Promise<void>;
  getBiometricCredential(credentialId: string): Promise<any>;
  getAllBiometricCredentials(): Promise<any[]>;
  getUserBiometricCredentials(userId: string): Promise<any[]>;
  deleteBiometricCredentials(userId: string): Promise<void>;
  
  // Notifications
  createNotification(notification: any): Promise<any>;
  getUserNotifications(userId: string): Promise<any[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  getFeedback(feedbackId: string): Promise<any>;
  
  // Global Settings
  updateAllTournamentsPricing(pricing: { monthlyPriceUsd: number; monthlyPriceGbp: number; annualPriceUsd: number; annualPriceGbp: number; }): Promise<number>;
  
  // Subscription Management
  updateUserSubscription(userId: string, subscription: { subscriptionStatus: string; subscriptionType: string; subscriptionEndDate: Date; paymentIntentId: string; }): Promise<any>;
  
  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<any>;
  updateNotificationPreferences(userId: string, preferences: any): Promise<any>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getTournaments(): Promise<any[]> {
    const result = await db.execute(sql`SELECT * FROM tournaments ORDER BY created_at DESC`);
    return result.rows.map(tournament => ({
      ...tournament,
      isActive: tournament.is_active,  // Map database column to frontend property
      createdAt: tournament.created_at,
      startDate: tournament.start_date,
      endDate: tournament.end_date,
      gameType: tournament.game_type,
      createdBy: tournament.created_by
    }));
  }

  async getUserTournaments(userId: string): Promise<any[]> {
    try {
      console.log('🔍 Getting tournaments for user ID:', userId);
      
      // Get tournaments where user is creator or participant
      const result = await db.execute(sql`
        SELECT DISTINCT 
          t.id, 
          t.name, 
          t.description, 
          t.image, 
          t.created_by, 
          t.created_at, 
          t.start_date, 
          t.end_date, 
          t.is_active, 
          t.game_type, 
          t.default_formula_id
        FROM tournaments t
        LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
        WHERE t.created_by = ${userId} OR tp.player_id = ${userId}
        ORDER BY t.created_at DESC
      `);
      
      console.log('🔍 Found tournaments:', result.rows.length);
      
      const tournaments = result.rows.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        image: tournament.image,
        createdBy: tournament.created_by,
        createdAt: tournament.created_at,
        startDate: tournament.start_date,
        endDate: tournament.end_date,
        isActive: tournament.is_active,
        gameType: tournament.game_type,
        defaultFormulaId: tournament.default_formula_id
      }));
      
      console.log('🔍 Mapped tournaments:', tournaments);
      return tournaments;
    } catch (error) {
      console.error('❌ Error in getUserTournaments:', error);
      return [];
    }
  }

  async getTournament(id: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM tournaments WHERE id = ${id}`);
    const tournament = result.rows[0];
    if (!tournament) return undefined;
    
    return {
      ...tournament,
      isActive: tournament.is_active,
      createdAt: tournament.created_at,
      startDate: tournament.start_date,
      endDate: tournament.end_date,
      gameType: tournament.game_type,
      createdBy: tournament.created_by
    };
  }

  async getTournamentPlayers(tournamentId: string): Promise<any[]> {
    try {
      // Get all players in the tournament, including those added directly and those from game participation
      const result = await db.execute(sql`
        SELECT DISTINCT p.*, 
               COALESCE(tp.is_administrator, false) as isAdministrator,
               COALESCE(tp.can_record_results, false) as canRecordResults,
               COALESCE(tp.can_manage_formulas, false) as canManageFormulas
        FROM players p
        LEFT JOIN tournament_players tp ON p.id = tp.player_id AND tp.tournament_id = ${tournamentId}
        WHERE tp.tournament_id = ${tournamentId}
           OR p.id IN (
             SELECT DISTINCT tm.player_id
             FROM team_members tm
             JOIN teams t ON tm.team_id = t.id
             JOIN game_participants gp ON t.id = gp.team_id
             JOIN games g ON gp.game_id = g.id
             WHERE g.tournament_id = ${tournamentId}
           )
        ORDER BY p.name
      `);
      console.log(`🔍 Tournament ${tournamentId} players query result:`, result.rows?.length || 0);
      return result.rows || [];
    } catch (error) {
      console.error('❌ Error getting tournament players:', error);
      return [];
    }
  }

  async getGames(tournamentId?: string): Promise<any[]> {
    try {
      const whereClause = tournamentId ? sql`WHERE g.tournament_id = ${tournamentId}` : sql``;
      
      const result = await db.execute(sql`
        SELECT DISTINCT
          g.id,
          g.tournament_id as "tournamentId",
          g.date,
          g.is_team_game as "isTeamGame",
          g.notes,
          g.created_at as "createdAt",
          g.created_by as "createdBy",
          t.name as "tournamentName"
        FROM games g
        LEFT JOIN tournaments t ON g.tournament_id = t.id
        ${whereClause}
        ORDER BY g.date DESC
      `);
      
      return result.rows || [];
    } catch (error) {
      console.error('❌ Error getting games:', error);
      return [];
    }
  }

  async createFeedback(feedbackData: any): Promise<any> {
    try {
      const feedbackId = crypto.randomUUID();
      const result = await pool.query(`
        INSERT INTO feedback (id, tournament_id, user_id, message, category, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        feedbackId,
        feedbackData.tournamentId,
        feedbackData.userId,
        feedbackData.message,
        feedbackData.category,
        new Date()
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to create feedback:', error);
      throw error;
    }
  }

  async getFeedbackByTournament(tournamentId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM feedback 
      WHERE tournament_id = ${tournamentId} 
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  async getAllFeedback(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          f.*,
          t.name as tournament_name,
          u.name as user_name
        FROM feedback f
        LEFT JOIN tournaments t ON f.tournament_id = t.id
        LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
      `);
      console.log('📋 Retrieved enhanced feedback from database:', result.rows);
      return result.rows || [];
    } catch (error) {
      console.error('❌ Error getting all feedback:', error);
      return [];
    }
  }

  async updateFeedbackStatus(id: string, status: string): Promise<any> {
    const result = await db.execute(sql`
      UPDATE feedback 
      SET status = ${status} 
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0];
  }

  async createFeedbackResponse(response: any): Promise<any> {
    const responseId = response.id || `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await db.execute(sql`
      INSERT INTO feedback_responses (id, feedback_id, responder_id, message, created_at)
      VALUES (${responseId}, ${response.feedbackId}, ${response.responderId}, ${response.message}, NOW())
      RETURNING *
    `);
    return result.rows[0];
  }

  async getFeedbackResponses(feedbackId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM feedback_responses 
      WHERE feedback_id = ${feedbackId} 
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  async getFeedback(feedbackId: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM feedback WHERE id = ${feedbackId}
    `);
    return result.rows[0];
  }

  async createNotification(notification: any): Promise<any> {
    const notificationId = notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await db.execute(sql`
      INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
      VALUES (${notificationId}, ${notification.userId}, ${notification.type}, ${notification.title}, ${notification.message}, ${JSON.stringify(notification.data)}, false, NOW())
      RETURNING *
    `);
    return result.rows[0];
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    // Temporarily return empty array until notifications table is created
    return [];
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db.execute(sql`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = ${notificationId}
    `);
  }

  async getUser(id: any): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
    const user = result.rows[0];
    if (user) {
      // Map database column names to JavaScript property names
      return {
        ...user,
        isAdmin: user.is_admin,
        isAppAdmin: user.is_app_admin,
        subscriptionStatus: user.subscription_status,
        subscriptionType: user.subscription_type,
        subscriptionValidUntil: user.subscription_valid_until,
        createdAt: user.created_at
      };
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM players WHERE username = ${username}`);
    const user = result.rows[0];
    if (user) {
      // Map database column names to JavaScript property names
      return {
        ...user,
        isAdmin: user.is_admin,
        isAppAdmin: user.is_app_admin
      };
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM users WHERE email = ${email}`);
    const user = result.rows[0];
    if (user) {
      // Map database column names to JavaScript property names
      return {
        ...user,
        isAdmin: user.is_admin,
        isAppAdmin: user.is_app_admin
      };
    }
    return undefined;
  }

  async createUser(user: any): Promise<any> {
    const [newUser] = await db
      .insert(users)
      .values({
        username: user.username,
        password: user.password,
        name: user.name || user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        isAppAdmin: user.isAppAdmin || false,
      })
      .returning();
    return newUser;
  }

  async updateUser(id: any, userData: any): Promise<any> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUserByEmail(email: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      return {
        ...user,
        isAdmin: user.isAdmin,
        isAppAdmin: user.isAppAdmin
      };
    }
    return undefined;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async createPasswordResetToken(tokenData: any): Promise<any> {
    const { passwordResetTokens } = await import('@shared/schema');
    const [token] = await db
      .insert(passwordResetTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<any> {
    const { passwordResetTokens } = await import('@shared/schema');
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    const { passwordResetTokens } = await import('@shared/schema');
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async getActiveTournamentsCount(): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM tournaments WHERE is_active = true`);
    return parseInt(result.rows[0].count);
  }

  async getTotalGamesCount(): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM games`);
    return parseInt(result.rows[0].count);
  }

  async getTotalPlayersCount(): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM players`);
    return parseInt(result.rows[0].count);
  }

  // Add all missing methods with basic implementations
  async getGame(id: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM games WHERE id = ${id}`);
    return result.rows[0];
  }

  async getGameParticipants(gameId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        gp.*,
        t.name as team_name,
        p.name as player_name
      FROM game_participants gp
      LEFT JOIN teams t ON gp.team_id = t.id
      LEFT JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = ${gameId}
    `);
    return result.rows || [];
  }

  async createGame(game: any, participants: any[]): Promise<any> {
    console.log('Creating game with data:', JSON.stringify(game));
    console.log('Creating participants:', JSON.stringify(participants));
    
    try {
      // Use Drizzle ORM instead of raw SQL to avoid syntax issues
      const [gameResult] = await db.insert(games).values({
        tournamentId: game.tournamentId,
        date: new Date(game.date),
        isTeamGame: game.isTeamGame || false,
        notes: game.notes || null,
        createdBy: game.createdBy || null
      }).returning();

      console.log('Game created:', gameResult);

      // Insert participants using Drizzle ORM
      for (const participant of participants) {
        console.log('Inserting participant:', participant);
        await db.insert(gameParticipants).values({
          gameId: gameResult.id,
          playerId: participant.playerId || null,
          teamId: participant.teamId || null,
          score: participant.score.toString(),
          isWinner: participant.isWinner || false
        });
      }

      return gameResult;
    } catch (error) {
      console.error('Detailed createGame error:', error);
      throw error;
    }
  }

  async getPlayers(): Promise<any[]> {
    const result = await db.execute(sql`SELECT * FROM players ORDER BY name`);
    return result.rows || [];
  }

  async getPlayer(id: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM players WHERE id = ${id}`);
    return result.rows[0];
  }

  async getPlayerByUserId(userId: string): Promise<any> {
    // First try to find player by matching username
    const userResult = await db.execute(sql`SELECT username FROM users WHERE id = ${userId}`);
    if (userResult.rows && userResult.rows.length > 0) {
      const username = userResult.rows[0].username;
      const playerResult = await db.execute(sql`SELECT * FROM players WHERE username = ${username}`);
      if (playerResult.rows && playerResult.rows.length > 0) {
        return playerResult.rows[0];
      }
    }
    
    // If no player found, create one for this user
    try {
      const user = await this.getUser(userId);
      if (user) {
        const newPlayer = await this.createPlayer({
          name: user.name || user.username,
          username: user.username,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus || 'free_trial'
        });
        return newPlayer;
      }
    } catch (error) {
      console.error('Error creating player for user:', error);
    }
    
    return null;
  }

  async getPlayerLeaderboard(tournamentId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id,
          p.name,
          COUNT(gp.id) as games_played,
          SUM(CASE WHEN gp.is_winner THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN NOT gp.is_winner THEN 1 ELSE 0 END) as losses,
          0 as draws,
          0 as points
        FROM players p
        LEFT JOIN game_participants gp ON gp.player_id = p.id
        LEFT JOIN games g ON g.id = gp.game_id AND g.tournament_id = ${tournamentId}
        WHERE p.id IN (
          SELECT DISTINCT tp.player_id 
          FROM tournament_players tp 
          WHERE tp.tournament_id = ${tournamentId}
        )
        GROUP BY p.id, p.name
        ORDER BY wins DESC, games_played DESC
      `);
      
      return (result.rows || []).map((row: any, index: number) => ({
        id: parseInt(row.id),
        name: row.name,
        gamesPlayed: parseInt(row.games_played || 0),
        wins: parseInt(row.wins || 0),
        losses: parseInt(row.losses || 0),
        draws: parseInt(row.draws || 0),
        points: parseInt(row.points || 0),
        position: index + 1
      }));
    } catch (error) {
      console.error('Error getting player leaderboard:', error);
      return [];
    }
  }

  async createPlayer(player: any): Promise<any> {
    try {
      const playerData = {
        id: crypto.randomUUID(),
        name: player.name,
        username: player.username || null,
        email: player.email || null,
        password: player.password || null,
        contact: player.contact || null,
        subscriptionStatus: player.subscriptionStatus || 'free_trial',
        subscriptionValidUntil: player.subscriptionValidUntil || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
        isActive: player.isActive !== undefined ? player.isActive : true
      };

      console.log("🔍 Creating player with data:", playerData);

      // Use raw SQL to avoid schema mismatch issues
      const result = await db.execute(sql`
        INSERT INTO players (id, name, username, email, password, contact, subscription_status, subscription_valid_until, is_active)
        VALUES (${playerData.id}, ${playerData.name}, ${playerData.username}, ${playerData.email}, ${playerData.password}, ${playerData.contact}, ${playerData.subscriptionStatus}, ${playerData.subscriptionValidUntil}, ${playerData.isActive})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating player:", error);
      throw new Error("Failed to create player profile. Please try again.");
    }
  }

  async updatePlayer(id: string, player: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE players SET name = ${player.name}, email = ${player.email}, is_active = ${player.isActive}
      WHERE id = ${id} RETURNING *
    `);
    return result.rows[0];
  }

  async deletePlayer(id: string): Promise<boolean> {
    const result = await db.execute(sql`DELETE FROM players WHERE id = ${id}`);
    return (result.rowCount || 0) > 0;
  }

  async addPlayerToTournament(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO tournament_players (tournament_id, player_id, is_administrator, can_record_results, can_manage_formulas, joined_at)
      VALUES (${data.tournamentId}, ${data.playerId}, ${data.isAdministrator || false}, ${data.canRecordResults || false}, ${data.canManageFormulas || false}, NOW())
      RETURNING *
    `);
    
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to add player to tournament');
    }
    
    // Return properly serializable object
    return {
      tournamentId: data.tournamentId,
      playerId: data.playerId,
      isAdministrator: data.isAdministrator || false,
      canRecordResults: data.canRecordResults || false,
      canManageFormulas: data.canManageFormulas || false,
      joinedAt: new Date().toISOString()
    };
  }

  async removePlayerFromTournament(tournamentId: string, playerId: string): Promise<boolean> {
    const result = await db.execute(sql`
      DELETE FROM tournament_players 
      WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
    `);
    return (result.rowCount || 0) > 0;
  }

  async updateTournamentPlayerPermissions(tournamentId: string, playerId: string, permissions: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE tournament_players 
      SET is_administrator = ${permissions.isAdministrator}, can_record_results = ${permissions.canRecordResults}, can_manage_formulas = ${permissions.canManageFormulas}
      WHERE tournament_id = ${tournamentId} AND player_id = ${playerId}
      RETURNING *
    `);
    return result.rows[0];
  }

  async getTeams(tournamentId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM teams WHERE tournament_id = ${tournamentId} ORDER BY name
    `);
    return result.rows || [];
  }

  async getTeam(id: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM teams WHERE id = ${id}`);
    return result.rows[0];
  }

  async createTeam(team: any): Promise<any> {
    const teamId = team.id || nanoid();
    const result = await db.execute(sql`
      INSERT INTO teams (id, tournament_id, name, created_at)
      VALUES (${teamId}, ${team.tournamentId}, ${team.name}, NOW())
      RETURNING *
    `);
    return result.rows[0];
  }

  async updateTeam(id: string, team: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE teams SET name = ${team.name}, player1_id = ${team.player1Id}, player2_id = ${team.player2Id}
      WHERE id = ${id} RETURNING *
    `);
    return result.rows[0];
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.execute(sql`DELETE FROM teams WHERE id = ${id}`);
    return (result.rowCount || 0) > 0;
  }

  async addPlayerToTeam(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO team_members (team_id, player_id, joined_at)
      VALUES (${data.teamId}, ${data.playerId}, NOW())
      RETURNING *
    `);
    return result.rows[0];
  }

  async removePlayerFromTeam(teamId: string, playerId: string): Promise<boolean> {
    const result = await db.execute(sql`
      DELETE FROM team_members WHERE team_id = ${teamId} AND player_id = ${playerId}
    `);
    return (result.rowCount || 0) > 0;
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT p.* FROM players p 
      JOIN team_members tm ON p.id = tm.player_id 
      WHERE tm.team_id = ${teamId}
    `);
    return result.rows || [];
  }

  async createTournament(tournament: any): Promise<any> {
    const [result] = await db
      .insert(tournaments)
      .values({
        id: tournament.id,
        name: tournament.name,
        gameType: tournament.gameType,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        isActive: tournament.isActive !== undefined ? tournament.isActive : true,
        createdBy: tournament.createdBy,
        description: tournament.description || null,
        image: tournament.image || null
      })
      .returning();
    return result;
  }

  async updateTournament(id: string, tournament: any): Promise<any> {
    console.log('Updating tournament:', id, 'with data:', tournament);
    
    // Build dynamic update query based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    if (tournament.name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      values.push(tournament.name);
    }
    
    if (tournament.description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      values.push(tournament.description);
    }
    
    if (tournament.isActive !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      values.push(tournament.isActive);
    }
    
    if (tournament.image !== undefined) {
      paramCount++;
      updateFields.push(`image = $${paramCount}`);
      values.push(tournament.image);
    }

    if (updateFields.length === 0) {
      // No fields to update
      const result = await db.execute(sql`SELECT * FROM tournaments WHERE id = ${id}`);
      return result.rows[0];
    }

    // Add the id parameter at the end
    paramCount++;
    values.push(id);

    const query = `UPDATE tournaments SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    console.log('Update query:', query, 'with values:', values);
    
    const { pool } = await import("./db");
    const result = await pool.query(query, values);
    
    console.log('Update result:', result.rows[0]);
    return result.rows[0];
  }

  async deleteTournament(id: string): Promise<boolean> {
    const result = await db.execute(sql`DELETE FROM tournaments WHERE id = ${id}`);
    return (result.rowCount || 0) > 0;
  }

  async getLeaderboardFormulas(tournamentId: string): Promise<LeaderboardFormula[]> {
    const formulas = await db
      .select()
      .from(leaderboardFormulas)
      .where(eq(leaderboardFormulas.tournamentId, tournamentId));
    return formulas;
  }

  async getAllLeaderboardFormulas(): Promise<any[]> {
    const result = await db.execute(sql`SELECT * FROM leaderboard_formulas`);
    return result.rows || [];
  }

  async getLeaderboardFormula(id: string): Promise<LeaderboardFormula | undefined> {
    const [formula] = await db
      .select()
      .from(leaderboardFormulas)
      .where(eq(leaderboardFormulas.id, id));
    return formula;
  }

  async createLeaderboardFormula(formula: InsertLeaderboardFormula): Promise<LeaderboardFormula> {
    const [createdFormula] = await db
      .insert(leaderboardFormulas)
      .values(formula)
      .returning();
    return createdFormula;
  }

  async updateLeaderboardFormula(id: string, formula: Partial<InsertLeaderboardFormula>): Promise<LeaderboardFormula | undefined> {
    const [updatedFormula] = await db
      .update(leaderboardFormulas)
      .set(formula)
      .where(eq(leaderboardFormulas.id, id))
      .returning();
    return updatedFormula;
  }

  async deleteLeaderboardFormula(id: string): Promise<boolean> {
    const result = await db
      .delete(leaderboardFormulas)
      .where(eq(leaderboardFormulas.id, id));
    return result.rowCount > 0;
  }

  async getAdminActivityLogs(): Promise<any[]> {
    return []; // Placeholder for now
  }

  async logAdminActivity(log: any): Promise<any> {
    return {}; // Placeholder for now
  }

  // Social Features Implementation
  async getActivityFeed(params: { tournamentId?: string; playerId?: string; limit: number }): Promise<any[]> {
    try {
      // Generate activity feed from recent games and achievements
      const activities = [];
      
      // Get recent games for activity feed
      const recentGames = await db.select({
        id: games.id,
        gameDate: games.gameDate,
        winnersScore: games.winnersScore,
        losersScore: games.losersScore,
        tournamentId: games.tournamentId
      })
      .from(games)
      .orderBy(desc(games.gameDate))
      .limit(params.limit || 20);

      // Convert games to activity items
      for (const game of recentGames) {
        // Get game participants to create activity entries
        const participants = await db.select()
          .from(gameParticipants)
          .innerJoin(players, eq(gameParticipants.playerId, players.id))
          .where(eq(gameParticipants.gameId, game.id));

        const winners = participants.filter(p => p.game_participants.isWinner);
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, game.tournamentId)).limit(1);

        for (const winner of winners) {
          activities.push({
            id: `game-win-${game.id}-${winner.players.id}`,
            type: 'game_win',
            playerId: winner.players.id,
            playerName: winner.players.name || winner.players.username,
            message: `won a game in ${tournament[0]?.name || 'tournament'}`,
            timestamp: game.gameDate,
            likes: Math.floor(Math.random() * 10), // Would be from actual likes table
            comments: Math.floor(Math.random() * 5),
            tournamentName: tournament[0]?.name
          });
        }
      }

      return activities.slice(0, params.limit);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  }

  async toggleActivityLike(activityId: string, userId: string): Promise<any> {
    // In a real implementation, you'd have an activity_likes table
    // For now, return a success response
    return { liked: true, newLikeCount: Math.floor(Math.random() * 15) + 1 };
  }

  // Biometric Authentication Implementation
  async storeBiometricCredential(credential: { userId: string; credentialId: string; publicKey: string; counter: number }): Promise<void> {
    try {
      await db.insert(biometricCredentials).values({
        userId: credential.userId,
        credentialId: credential.credentialId,
        publicKey: credential.publicKey,
        counter: credential.counter
      });
      console.log('✓ Stored biometric credential for user:', credential.userId);
    } catch (error) {
      console.error('❌ Error storing biometric credential:', error);
      throw error;
    }
  }

  async getBiometricCredential(credentialId: string): Promise<any> {
    try {
      const [credential] = await db.select().from(biometricCredentials).where(eq(biometricCredentials.credentialId, credentialId));
      return credential;
    } catch (error) {
      console.error('❌ Error getting biometric credential:', error);
      return null;
    }
  }

  async getAllBiometricCredentials(): Promise<any[]> {
    try {
      const credentials = await db.select().from(biometricCredentials);
      return credentials;
    } catch (error) {
      console.error('❌ Error getting all biometric credentials:', error);
      return [];
    }
  }

  async updateAllTournamentsPricing(pricing: {
    monthlyPriceUsd: number;
    monthlyPriceGbp: number;
    annualPriceUsd: number;
    annualPriceGbp: number;
  }): Promise<number> {
    try {
      console.log("💰 Updating pricing in storage:", pricing);
      const result = await db
        .update(tournaments)
        .set({
          monthlyPriceUsd: pricing.monthlyPriceUsd,
          monthlyPriceGbp: pricing.monthlyPriceGbp,
          annualPriceUsd: pricing.annualPriceUsd,
          annualPriceGbp: pricing.annualPriceGbp
        });
      
      console.log("💰 Pricing update result:", result);
      return result.length || 0;
    } catch (error) {
      console.error("❌ Error updating tournament pricing:", error);
      throw error;
    }
  }

  async updateUserSubscription(userId: string, subscription: { 
    subscriptionStatus: string; 
    subscriptionType: string; 
    subscriptionEndDate: Date; 
    paymentIntentId: string; 
  }): Promise<any> {
    try {
      console.log("🔄 Updating user subscription:", { userId, subscription });
      
      // Update user subscription in database
      const result = await pool.query(`
        UPDATE players 
        SET subscription_status = $1, 
            subscription_type = $2, 
            subscription_valid_until = $3
        WHERE id = $4 
        RETURNING *
      `, [
        subscription.subscriptionStatus,
        subscription.subscriptionType,
        subscription.subscriptionEndDate,
        userId
      ]);

      if (result.rows.length === 0) {
        // Check if user exists at all
        const userExists = await pool.query('SELECT id FROM players WHERE id = $1', [userId]);
        if (userExists.rows.length === 0) {
          throw new Error(`User not found with ID: ${userId}`);
        } else {
          throw new Error('Failed to update user subscription');
        }
      }

      console.log("✅ Subscription updated successfully:", result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating user subscription:", error);
      throw error;
    }
  }

  async getNotificationPreferences(userId: string): Promise<any> {
    const { notificationPreferences } = await import('@shared/schema');
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    
    // Return default preferences if none exist
    if (!preferences) {
      return {
        emailNotifications: true,
        tournamentUpdates: true,
        gameReminders: true,
        achievementAlerts: true,
        leaderboardChanges: false,
        socialUpdates: true,
        marketingEmails: false,
      };
    }
    
    return preferences;
  }

  async updateNotificationPreferences(userId: string, preferences: any): Promise<any> {
    const { notificationPreferences } = await import('@shared/schema');
    
    try {
      // Try to update existing preferences first
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          emailNotifications: preferences.emailNotifications,
          tournamentUpdates: preferences.tournamentUpdates,
          gameReminders: preferences.gameReminders,
          achievementAlerts: preferences.achievementAlerts,
          leaderboardChanges: preferences.leaderboardChanges,
          socialUpdates: preferences.socialUpdates,
          marketingEmails: preferences.marketingEmails,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      
      if (updated) {
        return updated;
      }
    } catch (error) {
      // If update fails, try to create new
    }

    // Create new preferences if update failed
    const [created] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        emailNotifications: preferences.emailNotifications,
        tournamentUpdates: preferences.tournamentUpdates,
        gameReminders: preferences.gameReminders,
        achievementAlerts: preferences.achievementAlerts,
        leaderboardChanges: preferences.leaderboardChanges,
        socialUpdates: preferences.socialUpdates,
        marketingEmails: preferences.marketingEmails,
      })
      .returning();
    
    return created;
  }

  async getUserBiometricCredentials(userId: string): Promise<any[]> {
    try {
      const credentials = await db.select().from(biometricCredentials).where(eq(biometricCredentials.userId, userId));
      return credentials || [];
    } catch (error) {
      console.error('❌ Error getting user biometric credentials:', error);
      return [];
    }
  }

  async deleteBiometricCredentials(userId: string): Promise<void> {
    try {
      await db.delete(biometricCredentials).where(eq(biometricCredentials.userId, userId));
      console.log('✓ Deleted biometric credentials for user:', userId);
    } catch (error) {
      console.error('❌ Error deleting biometric credentials:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();