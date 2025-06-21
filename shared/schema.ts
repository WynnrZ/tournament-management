import { pgTable, text, serial, integer, boolean, timestamp, json, foreignKey, numeric, primaryKey, uuid, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isAppAdmin: boolean("is_app_admin").default(false).notNull(),
  subscriptionStatus: text("subscription_status").default("free_trial").notNull(),
  subscriptionType: text("subscription_type"),
  subscriptionValidUntil: timestamp("subscription_valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  tournamentUpdates: boolean("tournament_updates").default(true).notNull(),
  gameReminders: boolean("game_reminders").default(true).notNull(),
  achievementAlerts: boolean("achievement_alerts").default(true).notNull(),
  leaderboardChanges: boolean("leaderboard_changes").default(false).notNull(),
  socialUpdates: boolean("social_updates").default(true).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Biometric credentials table
export const biometricCredentials = pgTable("biometric_credentials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isAdmin: true,
  isAppAdmin: true,
  createdAt: true,
});

// Tournaments table
export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by").references(() => users.id),
  gameType: text("game_type").notNull(),
  scoreFormula: json("score_formula"),
  defaultFormulaId: text("default_formula_id").references(() => leaderboardFormulas.id),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

// Player Analytics and Insights
export const playerAnalytics = pgTable("player_analytics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id),
  tournamentId: text("tournament_id").references(() => tournaments.id),
  metric: text("metric").notNull(), // 'weekend_performance', 'monthly_improvement', 'best_time_of_day', etc.
  value: numeric("value").notNull(),
  metadata: json("metadata"), // Additional context data
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const playerPredictions = pgTable("player_predictions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id),
  opponentId: text("opponent_id").references(() => players.id),
  tournamentId: text("tournament_id").references(() => tournaments.id),
  predictionType: text("prediction_type").notNull(), // 'match_outcome', 'score_prediction', 'performance_trend'
  confidence: numeric("confidence").notNull(), // 0-100
  prediction: json("prediction").notNull(),
  accuracy: numeric("accuracy"), // Track prediction accuracy over time
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerMilestones = pgTable("player_milestones", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id),
  tournamentId: text("tournament_id").references(() => tournaments.id),
  milestoneType: text("milestone_type").notNull(), // 'personal_best', 'win_streak', 'total_games'
  currentValue: numeric("current_value").notNull(),
  targetValue: numeric("target_value").notNull(),
  isAchieved: boolean("is_achieved").default(false).notNull(),
  achievedAt: timestamp("achieved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerRecommendations = pgTable("player_recommendations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id),
  recommendedPlayerId: text("recommended_player_id").notNull().references(() => players.id),
  tournamentId: text("tournament_id").references(() => tournaments.id),
  recommendationType: text("recommendation_type").notNull(), // 'similar_skill', 'good_match', 'learning_opportunity'
  score: numeric("score").notNull(), // Recommendation strength 0-100
  reason: text("reason").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Players table
export const players = pgTable("players", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  password: text("password"),
  contact: text("contact"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  subscriptionStatus: text("subscription_status", { enum: ["free_trial", "monthly", "annually", "expired"] }).default("free_trial").notNull(),
  subscriptionValidUntil: timestamp("subscription_valid_until").$defaultFn(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3); // 3 months from creation
    return date;
  }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  profileImage: text("profile_image"), // URL to uploaded profile photo
  bio: text("bio"), // Player biography for social features
  achievements: text("achievements").array(), // Array of achievement IDs
  preferredLanguage: text("preferred_language").default("en").notNull(), // Multi-language support
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

// Tournament Players junction table
export const tournamentPlayers = pgTable("tournament_players", {
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  playerId: text("player_id").references(() => players.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isAdministrator: boolean("is_administrator").default(false),
  canRecordResults: boolean("can_record_results").default(false),
  canManageFormulas: boolean("can_manage_formulas").default(false),
},
(table) => {
  return {
    pk: primaryKey({ columns: [table.tournamentId, table.playerId] }),
  };
});

export const insertTournamentPlayerSchema = createInsertSchema(tournamentPlayers).omit({
  joinedAt: true,
});

// Games table
export const games = pgTable("games", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  isTeamGame: boolean("is_team_game").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by").references(() => users.id),
});

export const insertGameSchema = createInsertSchema(games)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Make date accept string format as well
    date: z.union([z.date(), z.string().transform(val => new Date(val))]),
  });

// Game Participants table
export const gameParticipants = pgTable("game_participants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  gameId: text("game_id").references(() => games.id).notNull(),
  playerId: text("player_id").references(() => players.id),
  teamId: text("team_id").references(() => teams.id),
  score: numeric("score", { precision: 10, scale: 2 }).notNull(),
  isWinner: boolean("is_winner").default(false),
});

export const insertGameParticipantSchema = createInsertSchema(gameParticipants)
  .omit({
    id: true,
  })
  .partial({ 
    gameId: true,
    playerId: true,
    teamId: true
  });

// Teams table (for team games)
export const teams = pgTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  playerCount: integer("player_count").default(2).notNull(),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
}).extend({
  playerIds: z.array(z.number()).min(2, { message: "Team must have at least 2 players" }),
});

// Team Members junction table
export const teamMembers = pgTable("team_members", {
  teamId: text("team_id").references(() => teams.id).notNull(),
  playerId: text("player_id").references(() => players.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
},
(table) => {
  return {
    pk: primaryKey({ columns: [table.teamId, table.playerId] }),
  };
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  joinedAt: true,
});

// Leaderboard Formulas table
export const leaderboardFormulas = pgTable("leaderboard_formulas", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  name: text("name").notNull(),
  formula: json("formula").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by").references(() => users.id),
});

export const insertLeaderboardFormulaSchema = createInsertSchema(leaderboardFormulas).omit({
  id: true,
  createdAt: true,
}).extend({
  formula: z.object({
    name: z.string().min(1, "Formula name is required"),
    description: z.string().optional(),
    rules: z.array(z.object({
      id: z.string(),
      condition: z.object({
        type: z.enum(["score_differential", "winner_score", "loser_score", "total_score"]),
        operator: z.enum(["equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between"]),
        value: z.union([z.number(), z.array(z.number())]),
      }),
      winnerPoints: z.number().min(0),
      loserPoints: z.number().min(0).default(0),
      description: z.string().optional(),
    })).min(1, "At least one rule is required"),
    defaultWinnerPoints: z.number().min(0).default(1),
    defaultLoserPoints: z.number().min(0).default(0),
  })
});

// Admin Activity Logs table
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  actionType: text("action_type").notNull(), // permission_change, player_removed, etc.
  targetPlayerId: integer("target_player_id").references(() => players.id),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({
  id: true,
  createdAt: true,
});

// Feedback system
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  title: text("title"),
  message: text("message").notNull(),
  category: text("category").notNull(),
  priority: text("priority").default("medium"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const feedbackResponses = pgTable("feedback_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  feedbackId: text("feedback_id").references(() => feedback.id).notNull(),
  responderId: text("responder_id").references(() => players.id).notNull(),
  message: text("message").notNull(),
  isFromAdmin: boolean("is_from_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  eventDate: timestamp("event_date"),
  eventTime: text("event_time"),
  location: text("location"),
  requiresResponse: boolean("requires_response").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationResponses = pgTable("notification_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  notificationId: text("notification_id").references(() => notifications.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: text("status", { enum: ["attending", "not_attending", "maybe"] }).notNull(),
  message: text("message"),
  respondedAt: timestamp("responded_at").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeedbackResponseSchema = createInsertSchema(feedbackResponses).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationResponseSchema = createInsertSchema(notificationResponses).omit({
  id: true,
  respondedAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationResponse = typeof notificationResponses.$inferSelect;
export type InsertNotificationResponse = z.infer<typeof insertNotificationResponseSchema>;

// Define specialized leaderboard types
export type LeaderboardEntry = {
  id: number;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  position: number;
  specialEvents?: Array<{
    type: string;
    description: string;
    count: number;
  }>;
  movement?: {
    direction: 'up' | 'down' | 'same';
    positions: number;
  } | null;
}

// Enhanced Achievements System
export const achievements = pgTable("achievements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Lucide icon name
  category: text("category").notNull(), // 'wins', 'participation', 'streak', 'milestone'
  requirements: json("requirements").notNull(), // { type: 'win_count', value: 10 }
  points: integer("points").default(0).notNull(),
  rarity: text("rarity").notNull().default('common'), // 'common', 'rare', 'epic', 'legendary'
  isActive: boolean("is_active").default(true).notNull(),
  tournamentId: text("tournament_id").references(() => tournaments.id), // null for global achievements
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player Achievements
export const playerAchievements = pgTable("player_achievements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id").notNull().references(() => players.id),
  achievementId: text("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  tournamentId: text("tournament_id").references(() => tournaments.id),
  progress: integer("progress").default(0).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
});

// Social Features - Player Following
export const playerFollows = pgTable("player_follows", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  followerId: text("follower_id").references(() => players.id).notNull(),
  followingId: text("following_id").references(() => players.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tournament Highlights/Posts
export const tournamentHighlights = pgTable("tournament_highlights", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  createdBy: text("created_by").references(() => players.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"), // Photo upload URL
  gameId: text("game_id").references(() => games.id), // If highlighting a specific game
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Language Translations
export const translations = pgTable("translations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull(), // e.g., "dashboard.title"
  language: text("language").notNull(), // ISO code: en, es, fr, de, etc.
  value: text("value").notNull(),
  category: text("category").notNull(), // ui, email, notifications, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leaderboard Snapshots for Movement Tracking
export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id").references(() => tournaments.id).notNull(),
  playerId: text("player_id").references(() => players.id),
  teamId: text("team_id").references(() => teams.id),
  position: integer("position").notNull(),
  points: numeric("points", { precision: 10, scale: 2 }).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(), // Match day when snapshot was taken
  snapshotType: text("snapshot_type").notNull(), // 'player' or 'team'
  formulaId: text("formula_id").references(() => leaderboardFormulas.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



export type PlayerFollow = typeof playerFollows.$inferSelect;
export type InsertPlayerFollow = z.infer<typeof insertPlayerFollowSchema>;
export const insertPlayerFollowSchema = createInsertSchema(playerFollows).omit({
  id: true,
  createdAt: true,
});

export type TournamentHighlight = typeof tournamentHighlights.$inferSelect;
export type InsertTournamentHighlight = z.infer<typeof insertTournamentHighlightSchema>;
export const insertTournamentHighlightSchema = createInsertSchema(tournamentHighlights).omit({
  id: true,
  createdAt: true,
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  createdAt: true,
});

export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;
export type InsertLeaderboardSnapshot = z.infer<typeof insertLeaderboardSnapshotSchema>;
export const insertLeaderboardSnapshotSchema = createInsertSchema(leaderboardSnapshots).omit({
  id: true,
  createdAt: true,
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export type PlayerAchievement = typeof playerAchievements.$inferSelect;
export type InsertPlayerAchievement = z.infer<typeof insertPlayerAchievementSchema>;
export const insertPlayerAchievementSchema = createInsertSchema(playerAchievements).omit({
  id: true,
  unlockedAt: true,
});

export type PlayerAnalytic = typeof playerAnalytics.$inferSelect;
export type InsertPlayerAnalytic = z.infer<typeof insertPlayerAnalyticSchema>;
export const insertPlayerAnalyticSchema = createInsertSchema(playerAnalytics).omit({
  id: true,
  calculatedAt: true,
});

export type PlayerPrediction = typeof playerPredictions.$inferSelect;
export type InsertPlayerPrediction = z.infer<typeof insertPlayerPredictionSchema>;
export const insertPlayerPredictionSchema = createInsertSchema(playerPredictions).omit({
  id: true,
  createdAt: true,
});

export type PlayerMilestone = typeof playerMilestones.$inferSelect;
export type InsertPlayerMilestone = z.infer<typeof insertPlayerMilestoneSchema>;
export const insertPlayerMilestoneSchema = createInsertSchema(playerMilestones).omit({
  id: true,
  createdAt: true,
});

export type PlayerRecommendation = typeof playerRecommendations.$inferSelect;
export type InsertPlayerRecommendation = z.infer<typeof insertPlayerRecommendationSchema>;
export const insertPlayerRecommendationSchema = createInsertSchema(playerRecommendations).omit({
  id: true,
  createdAt: true,
});

export type TeamLeaderboardEntry = {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  position: number;
  memberCount: number;
  movement?: {
    direction: 'up' | 'down' | 'same';
    positions: number;
  } | null;
}

// Define types for all schemas
export type User = typeof users.$inferSelect & { userType?: 'admin' };
export type InsertUser = z.infer<typeof insertUserSchema>;

// Extended Player type for authentication
export type AuthenticatedPlayer = typeof players.$inferSelect & { userType?: 'player' };

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type TournamentPlayer = typeof tournamentPlayers.$inferSelect;
export type InsertTournamentPlayer = z.infer<typeof insertTournamentPlayerSchema>;

export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type GameParticipant = typeof gameParticipants.$inferSelect;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type LeaderboardFormula = typeof leaderboardFormulas.$inferSelect;
export type InsertLeaderboardFormula = z.infer<typeof insertLeaderboardFormulaSchema>;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type FeedbackResponse = typeof feedbackResponses.$inferSelect;
export type InsertFeedbackResponse = z.infer<typeof insertFeedbackResponseSchema>;





// Global system settings table
export const globalSettings = pgTable("global_settings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'system', 'tournament', 'subscription', 'communication', 'data'
  dataType: text("data_type").notNull().default("string"), // 'string', 'boolean', 'number', 'json'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").notNull().references(() => users.id),
});

// Global settings schemas
export const insertGlobalSettingsSchema = createInsertSchema(globalSettings);
export type GlobalSettings = typeof globalSettings.$inferSelect;
export type InsertGlobalSettings = z.infer<typeof insertGlobalSettingsSchema>;

// Password reset token types
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Notification preferences types
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
