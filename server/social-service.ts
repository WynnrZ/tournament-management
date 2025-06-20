import { db } from "./db";
import { 
  achievements, 
  playerAchievements, 
  playerFollows, 
  tournamentHighlights, 
  players,
  games,
  gameParticipants,
  tournaments
} from "@shared/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";

export class SocialService {
  
  // Initialize default achievements
  async initializeDefaultAchievements(): Promise<void> {
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
        name: "Perfect Game",
        description: "Win a game with a perfect score of 12",
        icon: "star",
        category: "wins",
        requirements: { type: "perfect_game", value: 1 },
        points: 50,
        rarity: "epic"
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
        await db.insert(achievements).values(achievement).onConflictDoNothing();
      } catch (error) {
        // Achievement might already exist, continue
      }
    }
  }

  // Get all achievements
  async getAchievements(category?: string) {
    const query = db.select().from(achievements);
    
    if (category) {
      return await query.where(eq(achievements.category, category));
    }
    
    return await query.where(eq(achievements.isActive, true));
  }

  // Get player achievements
  async getPlayerAchievements(playerId: string, tournamentId?: string) {
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

  // Get player game statistics
  async getPlayerStats(playerId: string, tournamentId?: string) {
    // Get all games for this player
    let gameQuery = db
      .select({
        gameId: gameParticipants.gameId,
        isWinner: gameParticipants.isWinner,
        score: gameParticipants.score,
        gameDate: games.createdAt,
        tournamentId: games.tournamentId
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(eq(gameParticipants.playerId, playerId))
      .orderBy(desc(games.createdAt));

    if (tournamentId) {
      gameQuery = gameQuery.where(eq(games.tournamentId, tournamentId)) as any;
    }

    const gameResults = await gameQuery;

    const stats = {
      totalGames: gameResults.length,
      totalWins: gameResults.filter(g => g.isWinner).length,
      totalLosses: gameResults.filter(g => !g.isWinner && g.score !== null).length,
      totalDraws: gameResults.filter(g => g.score === null).length,
      currentWinStreak: 0,
      longestWinStreak: 0,
      tournamentsParticipated: 0,
      perfectGames: gameResults.filter(g => g.isWinner && g.score === 12).length,
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
      ? validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length 
      : 0;

    return stats;
  }

  // Get player rivalries
  async getPlayerRivalries(playerId: string, tournamentId?: string) {
    // This is a simplified version - we'll get basic opponent statistics
    const allGames = await db
      .select({
        gameId: gameParticipants.gameId,
        opponentParticipant: sql`opponent.player_id`,
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

    // Group by opponent and calculate stats
    const rivalryMap = new Map();
    
    for (const game of allGames as any[]) {
      const opponentId = game.opponentParticipant;
      if (!rivalryMap.has(opponentId)) {
        rivalryMap.set(opponentId, {
          wins: 0,
          losses: 0,
          totalGames: 0,
          lastGameAt: null
        });
      }
      
      const rivalry = rivalryMap.get(opponentId);
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

  // Check and unlock achievements for a player
  async checkAchievements(playerId: string, tournamentId?: string) {
    const stats = await this.getPlayerStats(playerId, tournamentId);
    const existingAchievements = await this.getPlayerAchievements(playerId, tournamentId);
    const existingIds = existingAchievements.map(pa => pa.achievementId);
    
    const allAchievements = await this.getAchievements();
    const unlockedAchievements = [];
    
    for (const achievement of allAchievements) {
      if (existingIds.includes(achievement.id)) continue;
      
      const requirements = achievement.requirements as any;
      let shouldUnlock = false;
      
      switch (requirements.type) {
        case 'win_count':
          shouldUnlock = stats.totalWins >= requirements.value;
          break;
        case 'game_count':
          shouldUnlock = stats.totalGames >= requirements.value;
          break;
        case 'win_streak':
          shouldUnlock = stats.currentWinStreak >= requirements.value;
          break;
        case 'tournament_participation':
          shouldUnlock = stats.tournamentsParticipated >= requirements.value;
          break;
        case 'perfect_game':
          shouldUnlock = stats.perfectGames >= requirements.value;
          break;
      }
      
      if (shouldUnlock) {
        await db.insert(playerAchievements).values({
          playerId,
          achievementId: achievement.id,
          tournamentId,
          progress: 100,
          isCompleted: true
        });
        unlockedAchievements.push(achievement);
      }
    }
    
    return unlockedAchievements;
  }

  // Performance insights
  async getPlayerInsights(playerId: string, tournamentId?: string) {
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
      recentTrends: recentTrends.reverse(),
      strengthsWeaknesses: [] // Placeholder for more detailed analysis
    };
  }

  // Social features
  async followPlayer(followerId: string, followingId: string) {
    const [follow] = await db
      .insert(playerFollows)
      .values({ followerId, followingId })
      .returning();
    
    return follow;
  }

  async unfollowPlayer(followerId: string, followingId: string) {
    await db
      .delete(playerFollows)
      .where(
        and(
          eq(playerFollows.followerId, followerId),
          eq(playerFollows.followingId, followingId)
        )
      );
  }

  async getPlayerFollowers(playerId: string) {
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

  async getPlayerFollowing(playerId: string) {
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

  // Tournament highlights
  async createTournamentHighlight(highlight: any) {
    const [newHighlight] = await db
      .insert(tournamentHighlights)
      .values(highlight)
      .returning();
    
    return newHighlight;
  }

  async getTournamentHighlights(tournamentId: string) {
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

  async generateFormulaBasedAchievements(tournamentId: string) {
    // Import leaderboard formulas
    const { leaderboardFormulas } = await import("@shared/schema");
    
    // Get the tournament's formula
    const formulas = await db
      .select()
      .from(leaderboardFormulas)
      .where(eq(leaderboardFormulas.tournamentId, tournamentId));
    
    if (formulas.length === 0) return;
    
    const formula = formulas[0];
    const formulaData = formula.formula as any;
    
    if (!formulaData.rules) return;
    
    // Generate achievements based on special scoring rules
    for (const rule of formulaData.rules) {
      if (rule.condition && rule.condition.type === 'winner_score' && rule.condition.operator === 'equals') {
        const targetScore = rule.condition.value;
        const bonusPoints = rule.winnerPoints;
        
        // Only create achievements for special high-scoring rules (bonus points > default)
        if (bonusPoints > formulaData.defaultWinnerPoints && targetScore > 0) {
          await this.createFormulaAchievement({
            name: `Perfect ${targetScore}`,
            description: `Win a game with ${targetScore} points (${bonusPoints} tournament points)`,
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
  
  async createFormulaAchievement(achievement: any) {
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
        await db.insert(achievements).values(achievement);
      }
    } catch (error) {
      console.log(`Achievement already exists: ${achievement.name}`);
    }
  }
}

export const socialService = new SocialService();