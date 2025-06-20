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
import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

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
  
  // Feedback methods
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

  // Feedback methods
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
    const [updatedFeedback] = await db
      .update(feedback)
      .set({ status })
      .where(eq(feedback.id, id))
      .returning();
    return updatedFeedback || undefined;
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

  // User methods
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

  // Tournament methods
  async getTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db
      .insert(tournaments)
      .values(tournament)
      .returning();
    return newTournament;
  }

  async updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined> {
    const [updatedTournament] = await db
      .update(tournaments)
      .set(tournament)
      .where(eq(tournaments.id, id))
      .returning();
    return updatedTournament || undefined;
  }

  async deleteTournament(id: number): Promise<boolean> {
    const result = await db.delete(tournaments).where(eq(tournaments.id, id));
    return result.rowCount > 0;
  }

  // Player methods
  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players).orderBy(players.name);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db
      .insert(players)
      .values(player)
      .returning();
    return newPlayer;
  }

  async updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined> {
    const [updatedPlayer] = await db
      .update(players)
      .set(player)
      .where(eq(players.id, id))
      .returning();
    return updatedPlayer || undefined;
  }

  async deletePlayer(id: number): Promise<boolean> {
    const result = await db.delete(players).where(eq(players.id, id));
    return result.rowCount > 0;
  }

  // Tournament Player methods
  async addPlayerToTournament(tournamentPlayer: InsertTournamentPlayer): Promise<TournamentPlayer> {
    const [newTournamentPlayer] = await db
      .insert(tournamentPlayers)
      .values(tournamentPlayer)
      .returning();
    return newTournamentPlayer;
  }

  async removePlayerFromTournament(tournamentId: number, playerId: number): Promise<boolean> {
    const result = await db
      .delete(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, playerId)
        )
      );
    return result.rowCount > 0;
  }

  async getTournamentPlayers(tournamentId: number): Promise<Player[]> {
    const result = await db
      .select({
        id: players.id,
        name: players.name,
        email: players.email,
        password: players.password,
        image: players.image,
        isAdmin: players.isAdmin,
        subscriptionStatus: players.subscriptionStatus,
        subscriptionExpiresAt: players.subscriptionExpiresAt,
        createdAt: players.createdAt,
      })
      .from(players)
      .innerJoin(tournamentPlayers, eq(players.id, tournamentPlayers.playerId))
      .where(eq(tournamentPlayers.tournamentId, tournamentId))
      .orderBy(players.name);
    return result;
  }

  async getPlayerTournaments(playerId: number): Promise<Tournament[]> {
    const result = await db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        description: tournaments.description,
        image: tournaments.image,
        createdAt: tournaments.createdAt,
        isActive: tournaments.isActive,
        subscriptionPriceUsd: tournaments.subscriptionPriceUsd,
        subscriptionPriceGbp: tournaments.subscriptionPriceGbp,
      })
      .from(tournaments)
      .innerJoin(tournamentPlayers, eq(tournaments.id, tournamentPlayers.tournamentId))
      .where(eq(tournamentPlayers.playerId, playerId))
      .orderBy(tournaments.name);
    return result;
  }

  async updateTournamentPlayerPermissions(
    tournamentId: number, 
    playerId: number, 
    permissions: { isAdministrator?: boolean, canRecordResults?: boolean, canManageFormulas?: boolean }
  ): Promise<Player> {
    await db
      .update(tournamentPlayers)
      .set(permissions)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, playerId)
        )
      );
    
    const [player] = await db.select().from(players).where(eq(players.id, playerId));
    return player;
  }

  // Game methods
  async getGames(tournamentId?: string): Promise<Game[]> {
    if (tournamentId) {
      return await db
        .select()
        .from(games)
        .where(eq(games.tournamentId, tournamentId))
        .orderBy(desc(games.gameDate));
    }
    return await db.select().from(games).orderBy(desc(games.gameDate));
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async createGame(game: InsertGame, participants: InsertGameParticipant[]): Promise<Game> {
    return await db.transaction(async (tx) => {
      const [newGame] = await tx
        .insert(games)
        .values(game)
        .returning();

      for (const participant of participants) {
        await tx
          .insert(gameParticipants)
          .values({
            ...participant,
            gameId: newGame.id,
          });
      }

      return newGame;
    });
  }

  async getGameParticipants(gameId: number): Promise<GameParticipant[]> {
    return await db
      .select()
      .from(gameParticipants)
      .where(eq(gameParticipants.gameId, gameId));
  }

  // Team methods
  async getTeams(tournamentId: string): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId))
      .orderBy(teams.name);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db
      .insert(teams)
      .values(team)
      .returning();
    return newTeam;
  }

  async updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined> {
    const [updatedTeam] = await db
      .update(teams)
      .set(team)
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam || undefined;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return result.rowCount > 0;
  }

  // Team Member methods
  async addPlayerToTeam(teamMember: InsertTeamMember): Promise<TeamMember> {
    const [newTeamMember] = await db
      .insert(teamMembers)
      .values(teamMember)
      .returning();
    return newTeamMember;
  }

  async removePlayerFromTeam(teamId: number, playerId: number): Promise<boolean> {
    const result = await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.playerId, playerId)
        )
      );
    return result.rowCount > 0;
  }

  async getTeamMembers(teamId: number): Promise<Player[]> {
    const result = await db
      .select({
        id: players.id,
        name: players.name,
        email: players.email,
        password: players.password,
        image: players.image,
        isAdmin: players.isAdmin,
        subscriptionStatus: players.subscriptionStatus,
        subscriptionExpiresAt: players.subscriptionExpiresAt,
        createdAt: players.createdAt,
      })
      .from(players)
      .innerJoin(teamMembers, eq(players.id, teamMembers.playerId))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(players.name);
    return result;
  }

  // Leaderboard methods
  async getLeaderboardFormulas(tournamentId: string): Promise<LeaderboardFormula[]> {
    return await db
      .select()
      .from(leaderboardFormulas)
      .where(eq(leaderboardFormulas.tournamentId, tournamentId))
      .orderBy(leaderboardFormulas.name);
  }

  async getAllLeaderboardFormulas(): Promise<LeaderboardFormula[]> {
    return await db.select().from(leaderboardFormulas).orderBy(leaderboardFormulas.name);
  }

  async getLeaderboardFormula(id: string): Promise<LeaderboardFormula | undefined> {
    const [formula] = await db.select().from(leaderboardFormulas).where(eq(leaderboardFormulas.id, id));
    return formula || undefined;
  }

  async createLeaderboardFormula(formula: InsertLeaderboardFormula): Promise<LeaderboardFormula> {
    const [newFormula] = await db
      .insert(leaderboardFormulas)
      .values(formula)
      .returning();
    return newFormula;
  }

  async updateLeaderboardFormula(id: string, formula: Partial<InsertLeaderboardFormula>): Promise<LeaderboardFormula | undefined> {
    const [updatedFormula] = await db
      .update(leaderboardFormulas)
      .set(formula)
      .where(eq(leaderboardFormulas.id, id))
      .returning();
    return updatedFormula || undefined;
  }

  async deleteLeaderboardFormula(id: string): Promise<boolean> {
    const result = await db.delete(leaderboardFormulas).where(eq(leaderboardFormulas.id, id));
    return result.rowCount > 0;
  }

  // Stats methods
  async getActiveTournamentsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tournaments)
      .where(eq(tournaments.isActive, true));
    return result[0]?.count || 0;
  }

  async getTotalGamesCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(games);
    return result[0]?.count || 0;
  }

  async getTotalPlayersCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(players);
    return result[0]?.count || 0;
  }
}

export const storage = new DatabaseStorage();