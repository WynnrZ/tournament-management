// Minimal working storage with feedback methods
import { 
  users, tournaments, players, tournamentPlayers, games, gameParticipants, teams, teamMembers, leaderboardFormulas, feedback, feedbackResponses,
  type User, type InsertUser, type Tournament, type InsertTournament, 
  type Player, type InsertPlayer, type TournamentPlayer, type InsertTournamentPlayer,
  type Game, type InsertGame, type GameParticipant, type InsertGameParticipant,
  type Team, type InsertTeam, type TeamMember, type InsertTeamMember,
  type LeaderboardFormula, type InsertLeaderboardFormula,
  type Feedback, type InsertFeedback, type FeedbackResponse, type InsertFeedbackResponse
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Core user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Core tournament methods
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | undefined>;

  // Core player methods  
  getPlayers(): Promise<Player[]>;
  getTournamentPlayers(tournamentId: string): Promise<Player[]>;

  // Critical feedback methods
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByTournament(tournamentId: string): Promise<Feedback[]>;
  getAllFeedback(): Promise<Feedback[]>;
  updateFeedbackStatus(id: string, status: string): Promise<Feedback | undefined>;
  createFeedbackResponse(response: InsertFeedbackResponse): Promise<FeedbackResponse>;
  getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // Core user methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Core tournament methods
  async getTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  // Core player methods
  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players).orderBy(desc(players.createdAt));
  }

  async getTournamentPlayers(tournamentId: string): Promise<Player[]> {
    const result = await db
      .select({ 
        id: players.id,
        name: players.name,
        email: players.email,
        password: players.password,
        contact: players.contact,
        subscriptionStatus: players.subscriptionStatus,
        subscriptionValidUntil: players.subscriptionValidUntil,
        isActive: players.isActive,
        createdAt: players.createdAt
      })
      .from(players)
      .innerJoin(tournamentPlayers, eq(players.id, tournamentPlayers.playerId))
      .where(eq(tournamentPlayers.tournamentId, tournamentId));
    
    return result;
  }

  // Critical feedback methods - clean implementations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return newFeedback;
  }

  async getFeedbackByTournament(tournamentId: string): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.tournamentId, tournamentId))
      .orderBy(desc(feedback.createdAt));
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
  }

  async updateFeedbackStatus(id: string, status: string): Promise<Feedback | undefined> {
    const [updated] = await db
      .update(feedback)
      .set({ status, updatedAt: new Date() })
      .where(eq(feedback.id, id))
      .returning();
    return updated;
  }

  async createFeedbackResponse(response: InsertFeedbackResponse): Promise<FeedbackResponse> {
    const [newResponse] = await db
      .insert(feedbackResponses)
      .values(response)
      .returning();
    return newResponse;
  }

  async getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    return await db
      .select()
      .from(feedbackResponses)
      .where(eq(feedbackResponses.feedbackId, feedbackId))
      .orderBy(desc(feedbackResponses.createdAt));
  }
}

export const storage = new DatabaseStorage();