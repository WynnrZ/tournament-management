import { 
  users, tournaments, players, tournamentPlayers, games, gameParticipants, teams, teamMembers, leaderboardFormulas, adminActivityLogs, feedback, feedbackResponses,
  type User, type InsertUser, type Tournament, type InsertTournament, 
  type Player, type InsertPlayer, type TournamentPlayer, type InsertTournamentPlayer,
  type Game, type InsertGame, type GameParticipant, type InsertGameParticipant,
  type Team, type InsertTeam, type TeamMember, type InsertTeamMember,
  type LeaderboardFormula, type InsertLeaderboardFormula,
  type LeaderboardEntry, type TeamLeaderboardEntry,
  type AdminActivityLog, type InsertAdminActivityLog,
  type Feedback, type InsertFeedback, type FeedbackResponse, type InsertFeedbackResponse
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import createMemoryStore from "memorystore";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tournament methods
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;

  // Player methods
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;

  // Tournament Player methods
  addPlayerToTournament(tournamentPlayer: InsertTournamentPlayer): Promise<TournamentPlayer>;
  removePlayerFromTournament(tournamentId: number, playerId: number): Promise<boolean>;
  getTournamentPlayers(tournamentId: number): Promise<Player[]>;
  getPlayerTournaments(playerId: number): Promise<Tournament[]>;
  updateTournamentPlayerPermissions(
    tournamentId: number, 
    playerId: number, 
    permissions: { isAdministrator?: boolean, canRecordResults?: boolean, canManageFormulas?: boolean }
  ): Promise<Player>;

  // Game methods
  getGames(tournamentId?: string): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  createGame(game: InsertGame, participants: InsertGameParticipant[]): Promise<Game>;
  getGameParticipants(gameId: number): Promise<GameParticipant[]>;

  // Team methods
  getTeams(tournamentId: string): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Team Member methods
  addPlayerToTeam(teamMember: InsertTeamMember): Promise<TeamMember>;
  removePlayerFromTeam(teamId: number, playerId: number): Promise<boolean>;
  getTeamMembers(teamId: number): Promise<Player[]>;

  // Leaderboard methods
  getLeaderboardFormulas(tournamentId: string): Promise<LeaderboardFormula[]>;
  getAllLeaderboardFormulas(): Promise<LeaderboardFormula[]>;
  getLeaderboardFormula(id: string): Promise<LeaderboardFormula | undefined>;
  createLeaderboardFormula(formula: InsertLeaderboardFormula): Promise<LeaderboardFormula>;
  updateLeaderboardFormula(id: string, formula: Partial<InsertLeaderboardFormula>): Promise<LeaderboardFormula | undefined>;
  deleteLeaderboardFormula(id: string): Promise<boolean>;
  
  // Stats methods
  getActiveTournamentsCount(): Promise<number>;
  getTotalGamesCount(): Promise<number>;
  getTotalPlayersCount(): Promise<number>;
  
  // Feedback methods - clean implementations
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

  // Clean feedback implementations
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

  // Placeholder for other methods - will copy from original
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  // Add all other required methods here...
  async getTournaments(): Promise<Tournament[]> { return []; }
  async getTournament(id: string): Promise<Tournament | undefined> { return undefined; }
  async createTournament(tournament: InsertTournament): Promise<Tournament> { return {} as Tournament; }
  async updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined> { return undefined; }
  async deleteTournament(id: number): Promise<boolean> { return false; }
  async getPlayers(): Promise<Player[]> { return []; }
  async getPlayer(id: number): Promise<Player | undefined> { return undefined; }
  async createPlayer(player: InsertPlayer): Promise<Player> { return {} as Player; }
  async updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined> { return undefined; }
  async deletePlayer(id: number): Promise<boolean> { return false; }
  async addPlayerToTournament(tournamentPlayer: InsertTournamentPlayer): Promise<TournamentPlayer> { return {} as TournamentPlayer; }
  async removePlayerFromTournament(tournamentId: number, playerId: number): Promise<boolean> { return false; }
  async getTournamentPlayers(tournamentId: number): Promise<Player[]> { return []; }
  async getPlayerTournaments(playerId: number): Promise<Tournament[]> { return []; }
  async updateTournamentPlayerPermissions(tournamentId: number, playerId: number, permissions: any): Promise<Player> { return {} as Player; }
  async getGames(tournamentId?: string): Promise<Game[]> { return []; }
  async getGame(id: number): Promise<Game | undefined> { return undefined; }
  async createGame(game: InsertGame, participants: InsertGameParticipant[]): Promise<Game> { return {} as Game; }
  async getGameParticipants(gameId: number): Promise<GameParticipant[]> { return []; }
  async getTeams(tournamentId: string): Promise<Team[]> { return []; }
  async getTeam(id: number): Promise<Team | undefined> { return undefined; }
  async createTeam(team: InsertTeam): Promise<Team> { return {} as Team; }
  async updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined> { return undefined; }
  async deleteTeam(id: number): Promise<boolean> { return false; }
  async addPlayerToTeam(teamMember: InsertTeamMember): Promise<TeamMember> { return {} as TeamMember; }
  async removePlayerFromTeam(teamId: number, playerId: number): Promise<boolean> { return false; }
  async getTeamMembers(teamId: number): Promise<Player[]> { return []; }
  async getLeaderboardFormulas(tournamentId: string): Promise<LeaderboardFormula[]> { return []; }
  async getAllLeaderboardFormulas(): Promise<LeaderboardFormula[]> { return []; }
  async getLeaderboardFormula(id: string): Promise<LeaderboardFormula | undefined> { return undefined; }
  async createLeaderboardFormula(formula: InsertLeaderboardFormula): Promise<LeaderboardFormula> { return {} as LeaderboardFormula; }
  async updateLeaderboardFormula(id: string, formula: Partial<InsertLeaderboardFormula>): Promise<LeaderboardFormula | undefined> { return undefined; }
  async deleteLeaderboardFormula(id: string): Promise<boolean> { return false; }
  async getActiveTournamentsCount(): Promise<number> { return 0; }
  async getTotalGamesCount(): Promise<number> { return 0; }
  async getTotalPlayersCount(): Promise<number> { return 0; }
}

export const storage = new DatabaseStorage();