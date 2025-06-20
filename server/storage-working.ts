import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getTournaments(): Promise<any[]>;
  getTournament(id: string): Promise<any>;
  getTournamentPlayers(tournamentId: string): Promise<any[]>;
  getGames(tournamentId?: string): Promise<any[]>;
  createFeedback(feedback: any): Promise<any>;
  getFeedbackByTournament(tournamentId: string): Promise<any[]>;
  getAllFeedback(): Promise<any[]>;
  updateFeedbackStatus(id: string, status: string): Promise<any>;
  createFeedbackResponse(response: any): Promise<any>;
  getFeedbackResponses(feedbackId: string): Promise<any[]>;
  getUser(id: any): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
  getActiveTournamentsCount(): Promise<number>;
  getTotalGamesCount(): Promise<number>;
  getTotalPlayersCount(): Promise<number>;
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getTournaments(): Promise<any[]> {
    const result = await db.execute(sql`SELECT * FROM tournaments ORDER BY created_at DESC`);
    return result.rows;
  }

  async getTournament(id: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM tournaments WHERE id = ${id}`);
    return result.rows[0];
  }

  async getTournamentPlayers(tournamentId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT p.*, tp.is_administrator, tp.can_record_results, tp.can_manage_formulas
      FROM players p 
      JOIN tournament_players tp ON p.id = tp.player_id 
      WHERE tp.tournament_id = ${tournamentId}
      ORDER BY p.name
    `);
    return result.rows;
  }

  async getGames(tournamentId?: string): Promise<any[]> {
    if (tournamentId) {
      const result = await db.execute(sql`
        SELECT * FROM games 
        WHERE tournament_id = ${tournamentId} 
        ORDER BY game_date DESC
      `);
      return result.rows;
    }
    const result = await db.execute(sql`SELECT * FROM games ORDER BY game_date DESC`);
    return result.rows;
  }

  async createFeedback(feedbackData: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO feedback (id, tournament_id, player_id, message, category, status, created_at)
      VALUES (${feedbackData.id}, ${feedbackData.tournamentId}, ${feedbackData.playerId}, 
              ${feedbackData.message}, ${feedbackData.category}, ${feedbackData.status}, NOW())
      RETURNING *
    `);
    return result.rows[0];
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
    const result = await db.execute(sql`SELECT * FROM feedback ORDER BY created_at DESC`);
    return result.rows;
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
    const result = await db.execute(sql`
      INSERT INTO feedback_responses (id, feedback_id, responder_id, message, created_at)
      VALUES (${response.id}, ${response.feedbackId}, ${response.responderId}, ${response.message}, NOW())
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

  async getUser(id: any): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
    return result.rows[0];
  }

  async getUserByUsername(username: string): Promise<any> {
    const result = await db.execute(sql`SELECT * FROM users WHERE username = ${username}`);
    return result.rows[0];
  }

  async createUser(user: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO users (id, username, password, email, is_admin, subscription_status, subscription_expires_at, created_at)
      VALUES (${user.id}, ${user.username}, ${user.password}, ${user.email}, 
              ${user.isAdmin || false}, ${user.subscriptionStatus || 'free_trial'}, 
              ${user.subscriptionExpiresAt}, NOW())
      RETURNING *
    `);
    return result.rows[0];
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
}

export const storage = new DatabaseStorage();