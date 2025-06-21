import { db } from "./db";
import { 
  achievements, 
  playerAchievements, 
  playerFollows, 
  tournamentHighlights, 
  translations,
  players,
  games,
  gameParticipants,
  leaderboardFormulas,
  tournaments,
  type Achievement,
  type PlayerAchievement,
  type InsertAchievement,
  type InsertPlayerAchievement,
  type PlayerFollow,
  type InsertPlayerFollow,
  type TournamentHighlight,
  type InsertTournamentHighlight,
} from "@shared/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";

export class SocialGamingService {
  
  // Achievement System
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async getAchievements(category?: string): Promise<Achievement[]> {
    const query = db.select().from(achievements);
    
    if (category) {
      return await query.where(eq(achievements.category, category));
    }
    
    return await query.where(eq(achievements.isActive, true));
  }

  async getPlayerAchievements(playerId: string, tournamentId?: string): Promise<(PlayerAchievement & { achievement: Achievement })[]> {
    const query = db
      .select({
        id: playerAchievements.id,
        playerId: playerAchievements.playerId,
        achievementId: playerAchievements.achievementId,
        unlockedAt: playerAchievements.unlockedAt,
        tournamentId: playerAchievements.tournamentId,
        progress: playerAchievements.progress,
        isCompleted: playerAchievements.isCompleted,
        achievement: achievements
      })
      .from(playerAchievements)
      .innerJoin(achievements, eq(playerAchievements.achievementId, achievements.id));

    if (tournamentId) {
      return await query.where(
        and(
          eq(playerAchievements.playerId, playerId),
          eq(playerAchievements.tournamentId, tournamentId)
        )
      );
    }

    return await query.where(eq(playerAchievements.playerId, playerId));
  }

  async checkAndUnlockAchievements(playerId: string, tournamentId?: string): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];
    
    // Get all available achievements
    const availableAchievements = await this.getAchievements();
    
    // Get player's existing achievements
    const existingAchievements = await this.getPlayerAchievements(playerId, tournamentId);
    const existingIds = existingAchievements.map(pa => pa.achievementId);
    
    // Get player's game statistics
    const playerStats = await this.getPlayerGameStats(playerId, tournamentId);
    
    for (const achievement of availableAchievements) {
      if (existingIds.includes(achievement.id)) continue;
      
      const requirements = achievement.requirements as any;
      let shouldUnlock = false;
      
      switch (requirements.type) {
        case 'win_count':
          shouldUnlock = playerStats.totalWins >= requirements.value;
          break;
        case 'game_count':
          shouldUnlock = playerStats.totalGames >= requirements.value;
          break;
        case 'win_streak':
          shouldUnlock = playerStats.currentWinStreak >= requirements.value;
          break;
        case 'tournament_participation':
          shouldUnlock = playerStats.tournamentsParticipated >= requirements.value;
          break;
        case 'perfect_game':
          shouldUnlock = playerStats.perfectGames >= requirements.value;
          break;
        case 'perfect_shutout':
          shouldUnlock = playerStats.perfectShutouts >= requirements.value;
          break;
        case 'total_points':
          shouldUnlock = playerStats.totalPoints >= requirements.value;
          break;
        case 'special_score_win':
          shouldUnlock = await this.checkSpecialScoreAchievement(playerId, requirements);
          break;
      }
      
      if (shouldUnlock) {
        await this.unlockAchievement(playerId, achievement.id, tournamentId);
        unlockedAchievements.push(achievement);
      }
    }
    
    return unlockedAchievements;
  }

  async checkSpecialScoreAchievement(playerId: string, requirements: any): Promise<boolean> {
    const { value, tournamentId, targetScore } = requirements;
    
    // Count wins with the specific target score in the tournament
    const specialWins = await db
      .select()
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          eq(gameParticipants.isWinner, true),
          eq(gameParticipants.score, targetScore),
          eq(games.tournamentId, tournamentId)
        )
      );
    
    return specialWins.length >= value;
  }

  async unlockAchievement(playerId: string, achievementId: string, tournamentId?: string): Promise<PlayerAchievement> {
    const [playerAchievement] = await db
      .insert(playerAchievements)
      .values({
        playerId,
        achievementId,
        tournamentId,
        progress: 100,
        isCompleted: true
      })
      .returning();

    // Send achievement unlock email notification
    try {
      const { getResendEmailService } = await import('./resend-email-service');
      const emailService = getResendEmailService();
      
      if (emailService) {
        // Get player and achievement details
        const [player] = await db.select().from(users).where(eq(users.id, playerId));
        const [achievement] = await db.select().from(achievements).where(eq(achievements.id, achievementId));
        
        if (player && player.email && achievement) {
          const achievementData = {
            playerName: player.name,
            achievementTitle: achievement.title,
            achievementDescription: achievement.description,
            achievementCategory: achievement.category,
            achievementPoints: achievement.points || 0,
            unlockedDate: new Date().toLocaleDateString(),
            tournamentName: tournamentId ? 'Tournament Achievement' : 'Global Achievement'
          };

          // Create a custom achievement unlock email
          const subject = `🏆 Achievement Unlocked: ${achievement.title}`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">🏆 Achievement Unlocked!</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; font-size: 24px;">${achievement.title}</h2>
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">${achievement.description}</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                  <span style="font-size: 18px; font-weight: bold;">${achievement.points} Points Earned</span>
                </div>
              </div>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #374151;"><strong>Player:</strong> ${player.name}</p>
                <p style="margin: 0 0 10px 0; color: #374151;"><strong>Category:</strong> ${achievement.category}</p>
                <p style="margin: 0; color: #374151;"><strong>Unlocked:</strong> ${achievementData.unlockedDate}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/achievements" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View All Achievements
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Keep up the great work! Check your profile to see all your unlocked achievements.
              </p>
            </div>
          `;
          
          await emailService.sendCustomEmail(player.email, subject, html);
          console.log(`📧 Achievement unlock email sent to ${player.email} for: ${achievement.title}`);
        }
      }
    } catch (emailError) {
      console.warn('⚠️ Failed to send achievement unlock email:', emailError);
      // Don't fail the main operation if email fails
    }
    
    return playerAchievement;
  }

  // Player Statistics
  async getPlayerGameStats(playerId: string, tournamentId?: string): Promise<{
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    currentWinStreak: number;
    longestWinStreak: number;
    tournamentsParticipated: number;
    perfectGames: number;
    perfectShutouts: number;
    totalPoints: number;
    averageScore: number;
  }> {
    const baseQuery = db
      .select({
        gameId: gameParticipants.gameId,
        isWinner: gameParticipants.isWinner,
        score: gameParticipants.score,
        tournamentId: games.tournamentId
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(eq(gameParticipants.playerId, playerId))
      .orderBy(desc(games.createdAt));

    const gameResults = tournamentId 
      ? await baseQuery.where(eq(games.tournamentId, tournamentId))
      : await baseQuery;

    const stats = {
      totalGames: gameResults.length,
      totalWins: gameResults.filter(g => g.isWinner).length,
      totalLosses: gameResults.filter(g => !g.isWinner && g.score !== null).length,
      totalDraws: gameResults.filter(g => g.score === null).length,
      currentWinStreak: 0,
      longestWinStreak: 0,
      tournamentsParticipated: 0,
      perfectGames: gameResults.filter(g => g.isWinner && g.score === 12).length,
      perfectShutouts: 0, // Will calculate this based on opponent score
      totalPoints: 0, // Will need to calculate from leaderboard points
      averageScore: 0
    };

    // Calculate win streaks
    let currentStreak = 0;
    let longestStreak = 0;
    
    for (const game of gameResults) {
      if (game.isWinner) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    stats.currentWinStreak = currentStreak;
    stats.longestWinStreak = longestStreak;

    // Calculate tournaments participated
    const uniqueTournaments = new Set(gameResults.map(g => g.tournamentId));
    stats.tournamentsParticipated = uniqueTournaments.size;

    // Calculate average score
    const validScores = gameResults.filter(g => g.score !== null).map(g => g.score as number);
    stats.averageScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;

    // Calculate perfect shutouts (12-0 wins) - need to check opponent scores
    // For now, approximate as wins with score 12 where opponent likely scored 0
    stats.perfectShutouts = gameResults.filter(g => g.isWinner && g.score === 12).length;

    // Calculate total points from leaderboard (simplified - actual implementation would need leaderboard data)
    // For now, approximate as wins * 3 + draws * 1 (basic dominology scoring)
    stats.totalPoints = stats.totalWins * 3 + stats.totalDraws * 1;

    return stats;
  }

  // Player Rivalries
  async getPlayerRivalries(playerId: string, tournamentId?: string): Promise<Array<{
    opponentId: string;
    opponentName: string;
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
    lastGameAt: Date | null;
  }>> {
    // Get all games where this player participated
    const gameQuery = db
      .select({
        gameId: gameParticipants.gameId,
        opponentId: sql<string>`CASE WHEN ${gameParticipants.playerId} = ${playerId} THEN opponent.player_id ELSE ${gameParticipants.playerId} END`,
        playerWon: gameParticipants.isWinner,
        gameDate: games.createdAt,
        tournamentId: games.tournamentId
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .innerJoin(
        sql`game_participants opponent`,
        sql`opponent.game_id = ${gameParticipants.gameId} AND opponent.player_id != ${gameParticipants.playerId}`
      )
      .where(eq(gameParticipants.playerId, playerId));

    const rivalryGames = tournamentId
      ? await gameQuery.where(eq(games.tournamentId, tournamentId))
      : await gameQuery;

    // Group by opponent
    const rivalryMap = new Map();
    
    for (const game of rivalryGames) {
      if (!rivalryMap.has(game.opponentId)) {
        rivalryMap.set(game.opponentId, {
          wins: 0,
          losses: 0,
          totalGames: 0,
          lastGameAt: null
        });
      }
      
      const rivalry = rivalryMap.get(game.opponentId);
      rivalry.totalGames++;
      
      if (game.playerWon) {
        rivalry.wins++;
      } else {
        rivalry.losses++;
      }
      
      if (!rivalry.lastGameAt || game.gameDate > rivalry.lastGameAt) {
        rivalry.lastGameAt = game.gameDate;
      }
    }

    // Get opponent names
    const opponentIds = Array.from(rivalryMap.keys());
    const opponents = opponentIds.length > 0 
      ? await db.select({ id: players.id, name: players.name })
          .from(players)
          .where(inArray(players.id, opponentIds))
      : [];

    // Format results
    return opponents.map(opponent => {
      const rivalry = rivalryMap.get(opponent.id);
      return {
        opponentId: opponent.id,
        opponentName: opponent.name,
        wins: rivalry.wins,
        losses: rivalry.losses,
        totalGames: rivalry.totalGames,
        winRate: rivalry.totalGames > 0 ? (rivalry.wins / rivalry.totalGames) * 100 : 0,
        lastGameAt: rivalry.lastGameAt
      };
    }).sort((a, b) => b.totalGames - a.totalGames);
  }

  // Social Features
  async followPlayer(followerId: string, followingId: string): Promise<PlayerFollow> {
    const [follow] = await db
      .insert(playerFollows)
      .values({ followerId, followingId })
      .returning();
    
    return follow;
  }

  async unfollowPlayer(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(playerFollows)
      .where(
        and(
          eq(playerFollows.followerId, followerId),
          eq(playerFollows.followingId, followingId)
        )
      );
  }

  async getPlayerFollowers(playerId: string): Promise<Array<{ id: string; name: string; followedAt: Date }>> {
    return await db
      .select({
        id: players.id,
        name: players.name,
        followedAt: playerFollows.createdAt
      })
      .from(playerFollows)
      .innerJoin(players, eq(playerFollows.followerId, players.id))
      .where(eq(playerFollows.followingId, playerId));
  }

  async getPlayerFollowing(playerId: string): Promise<Array<{ id: string; name: string; followedAt: Date }>> {
    return await db
      .select({
        id: players.id,
        name: players.name,
        followedAt: playerFollows.createdAt
      })
      .from(playerFollows)
      .innerJoin(players, eq(playerFollows.followingId, players.id))
      .where(eq(playerFollows.followerId, playerId));
  }

  // Tournament Highlights
  async createTournamentHighlight(highlight: InsertTournamentHighlight): Promise<TournamentHighlight> {
    const [newHighlight] = await db
      .insert(tournamentHighlights)
      .values(highlight)
      .returning();
    
    return newHighlight;
  }

  async getTournamentHighlights(tournamentId: string): Promise<Array<TournamentHighlight & { creatorName: string }>> {
    return await db
      .select({
        id: tournamentHighlights.id,
        tournamentId: tournamentHighlights.tournamentId,
        createdBy: tournamentHighlights.createdBy,
        title: tournamentHighlights.title,
        content: tournamentHighlights.content,
        imageUrl: tournamentHighlights.imageUrl,
        gameId: tournamentHighlights.gameId,
        isPublic: tournamentHighlights.isPublic,
        createdAt: tournamentHighlights.createdAt,
        creatorName: players.name
      })
      .from(tournamentHighlights)
      .innerJoin(players, eq(tournamentHighlights.createdBy, players.id))
      .where(
        and(
          eq(tournamentHighlights.tournamentId, tournamentId),
          eq(tournamentHighlights.isPublic, true)
        )
      )
      .orderBy(desc(tournamentHighlights.createdAt));
  }

  // Player Performance Insights
  async getPlayerInsights(playerId: string, tournamentId?: string): Promise<{
    performanceByDayOfWeek: Array<{ day: string; winRate: number; gamesPlayed: number }>;
    performanceByOpponentType: Array<{ category: string; winRate: number; gamesPlayed: number }>;
    recentTrends: Array<{ period: string; winRate: number; gamesPlayed: number }>;
    strengthsWeaknesses: Array<{ metric: string; value: number; comparison: string }>;
  }> {
    const gameResults = await db
      .select({
        isWinner: gameParticipants.isWinner,
        score: gameParticipants.score,
        gameDate: games.createdAt,
        tournamentId: games.tournamentId
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        tournamentId 
          ? and(eq(gameParticipants.playerId, playerId), eq(games.tournamentId, tournamentId))
          : eq(gameParticipants.playerId, playerId)
      )
      .orderBy(desc(games.createdAt));

    // Performance by day of week
    const dayOfWeekStats = new Map();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const game of gameResults) {
      const dayOfWeek = game.gameDate.getDay();
      const dayName = dayNames[dayOfWeek];
      
      if (!dayOfWeekStats.has(dayName)) {
        dayOfWeekStats.set(dayName, { wins: 0, total: 0 });
      }
      
      const stats = dayOfWeekStats.get(dayName);
      stats.total++;
      if (game.isWinner) stats.wins++;
    }
    
    const performanceByDayOfWeek = Array.from(dayOfWeekStats.entries()).map(([day, stats]) => ({
      day,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      gamesPlayed: stats.total
    }));

    // Recent trends (last 4 weeks)
    const recentTrends = [];
    const now = new Date();
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      
      const weekGames = gameResults.filter(g => 
        g.gameDate >= weekStart && g.gameDate < weekEnd
      );
      
      const wins = weekGames.filter(g => g.isWinner).length;
      const total = weekGames.length;
      
      recentTrends.push({
        period: `Week ${i + 1}`,
        winRate: total > 0 ? (wins / total) * 100 : 0,
        gamesPlayed: total
      });
    }

    return {
      performanceByDayOfWeek,
      performanceByOpponentType: [], // To be implemented with more opponent data
      recentTrends: recentTrends.reverse(),
      strengthsWeaknesses: [] // To be implemented with more detailed analysis
    };
  }

  // Generate dynamic achievements based on tournament formulas
  async generateFormulaBasedAchievements(tournamentId: string): Promise<void> {
    // Get the tournament's formula
    const formulas = await db
      .select()
      .from(leaderboardFormulas)
      .where(eq(leaderboardFormulas.tournamentId, tournamentId));
    
    if (formulas.length === 0) return;
    
    const formula = formulas[0];
    const formulaData = formula.formulaData as any;
    
    if (!formulaData.rules) return;
    
    // Generate achievements based on special scoring rules
    for (const rule of formulaData.rules) {
      if (rule.condition && rule.condition.type === 'winner_score') {
        const targetScore = rule.condition.value;
        const bonusPoints = rule.winnerPoints;
        
        // Only create achievements for special high-scoring rules
        if (bonusPoints > 3 && targetScore > 0) {
          await this.createFormulaAchievement({
            name: `Perfect ${targetScore}`,
            description: `Win a game with a score of ${targetScore} (${bonusPoints} points)`,
            icon: "zap",
            category: "special",
            requirements: { 
              type: "special_score_win", 
              value: 1,
              tournamentId: tournamentId,
              targetScore: targetScore 
            },
            points: Math.min(bonusPoints * 10, 100),
            rarity: bonusPoints >= 9 ? "legendary" : bonusPoints >= 6 ? "epic" : "rare",
            tournamentId: tournamentId
          });
          
          // Create a multi-achievement for 5 of these special wins
          await this.createFormulaAchievement({
            name: `${targetScore}-Point Specialist`,
            description: `Achieve 5 victories with ${targetScore} points`,
            icon: "target",
            category: "special",
            requirements: { 
              type: "special_score_win", 
              value: 5,
              tournamentId: tournamentId,
              targetScore: targetScore 
            },
            points: Math.min(bonusPoints * 25, 200),
            rarity: "legendary",
            tournamentId: tournamentId
          });
        }
      }
    }
  }
  
  async createFormulaAchievement(achievement: any): Promise<void> {
    try {
      // Check if achievement already exists for this tournament
      const existing = await db
        .select()
        .from(achievements)
        .where(
          and(
            eq(achievements.name, achievement.name),
            eq(achievements.tournamentId, achievement.tournamentId)
          )
        );
      
      if (existing.length === 0) {
        await this.createAchievement(achievement);
      }
    } catch (error) {
      console.log(`Achievement already exists: ${achievement.name}`);
    }
  }

  // Seed initial achievements
  async seedDefaultAchievements(): Promise<void> {
    const defaultAchievements = [
      {
        name: "First Victory",
        description: "Win your first game",
        icon: "trophy",
        category: "wins",
        requirements: { type: "win_count", value: 1 },
        points: 10,
        rarity: "common"
      },
      {
        name: "Hat Trick",
        description: "Win 3 games in a row",
        icon: "flame",
        category: "streak",
        requirements: { type: "win_streak", value: 3 },
        points: 25,
        rarity: "rare"
      },
      {
        name: "Seasoned Player",
        description: "Play 50 games",
        icon: "gamepad-2",
        category: "participation",
        requirements: { type: "game_count", value: 50 },
        points: 30,
        rarity: "rare"
      },

      {
        name: "Tournament Champion",
        description: "Participate in 5 tournaments",
        icon: "crown",
        category: "participation",
        requirements: { type: "tournament_participation", value: 5 },
        points: 75,
        rarity: "epic"
      },
      {
        name: "Domination Master",
        description: "Win 100 games",
        icon: "shield",
        category: "wins",
        requirements: { type: "win_count", value: 100 },
        points: 100,
        rarity: "legendary"
      }
    ];

    for (const achievement of defaultAchievements) {
      try {
        await this.createAchievement(achievement);
      } catch (error) {
        // Achievement might already exist, continue
        console.log(`Achievement "${achievement.name}" already exists or failed to create`);
      }
    }
  }
}

export const socialGamingService = new SocialGamingService();