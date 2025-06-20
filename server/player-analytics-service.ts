import { db } from "./db";
import { eq, and, desc, sql, asc, gt, lt, gte, lte } from "drizzle-orm";
import { 
  players, 
  games, 
  gameParticipants, 
  tournaments,
  tournamentPlayers,
  playerAnalytics,
  playerPredictions,
  playerMilestones,
  playerRecommendations,
  type InsertPlayerAnalytic,
  type InsertPlayerPrediction,
  type InsertPlayerMilestone,
  type InsertPlayerRecommendation,
  type PlayerAnalytic,
  type PlayerPrediction,
  type PlayerMilestone,
  type PlayerRecommendation
} from "@shared/schema";

export class PlayerAnalyticsService {
  // Performance Insights
  async calculatePerformanceInsights(playerId: string, tournamentId?: string): Promise<{
    weekendPerformance: { improvement: number; description: string };
    timeOfDayPerformance: { bestTime: string; improvement: number; description: string };
    monthlyImprovement: { percentage: number; description: string };
    opponentTypePerformance: { insights: string[] };
  }> {
    // Calculate weekend vs weekday performance
    const weekendGames = await this.getPlayerGamesByDayType(playerId, 'weekend', tournamentId);
    const weekdayGames = await this.getPlayerGamesByDayType(playerId, 'weekday', tournamentId);
    
    const weekendWinRate = this.calculateWinRate(weekendGames);
    const weekdayWinRate = this.calculateWinRate(weekdayGames);
    const weekendImprovement = weekendWinRate - weekdayWinRate;

    // Calculate time of day performance
    const timePerformance = await this.getTimeOfDayPerformance(playerId, tournamentId);
    
    // Calculate monthly improvement
    const monthlyImprovement = await this.calculateMonthlyImprovement(playerId, tournamentId);

    // Analyze opponent performance patterns
    const opponentInsights = await this.analyzeOpponentPerformance(playerId, tournamentId);

    return {
      weekendPerformance: {
        improvement: Math.round(weekendImprovement * 100),
        description: weekendImprovement > 0 
          ? `Your win rate improves ${Math.round(weekendImprovement * 100)}% when playing on weekends`
          : `You perform ${Math.round(Math.abs(weekendImprovement) * 100)}% better on weekdays`
      },
      timeOfDayPerformance: timePerformance,
      monthlyImprovement: {
        percentage: monthlyImprovement,
        description: monthlyImprovement > 0 
          ? `Your dominology skills have improved ${monthlyImprovement}% this month`
          : `Focus on practice - your skills show room for ${Math.abs(monthlyImprovement)}% improvement`
      },
      opponentTypePerformance: {
        insights: opponentInsights
      }
    };
  }

  // AI-Powered Match Predictions
  async generateMatchPrediction(playerId: string, opponentId: string, tournamentId?: string): Promise<{
    winProbability: number;
    confidence: number;
    factors: string[];
    recommendedStrategy: string;
  }> {
    // Get historical performance between these players
    const headToHead = await this.getHeadToHeadStats(playerId, opponentId, tournamentId);
    
    // Get recent form for both players
    const playerForm = await this.getRecentForm(playerId, tournamentId);
    const opponentForm = await this.getRecentForm(opponentId, tournamentId);
    
    // Calculate win probability based on multiple factors
    let winProbability = 0.5; // Base 50%
    const factors: string[] = [];
    
    // Head-to-head history (30% weight)
    if (headToHead.totalGames > 0) {
      const h2hAdvantage = (headToHead.wins / headToHead.totalGames) - 0.5;
      winProbability += h2hAdvantage * 0.3;
      factors.push(`Head-to-head record: ${headToHead.wins}-${headToHead.losses}`);
    }
    
    // Recent form comparison (40% weight)
    const formDifference = (playerForm - opponentForm) / 2;
    winProbability += formDifference * 0.4;
    factors.push(`Recent form: ${Math.round(playerForm * 100)}% vs ${Math.round(opponentForm * 100)}%`);
    
    // Tournament context (20% weight)
    const tournamentAdvantage = await this.getTournamentAdvantage(playerId, opponentId, tournamentId);
    winProbability += tournamentAdvantage * 0.2;
    
    // Experience factor (10% weight)
    const experienceAdvantage = await this.getExperienceAdvantage(playerId, opponentId, tournamentId);
    winProbability += experienceAdvantage * 0.1;
    
    // Ensure probability stays within bounds
    winProbability = Math.max(0.1, Math.min(0.9, winProbability));
    
    // Calculate confidence based on data quality
    const confidence = this.calculatePredictionConfidence(headToHead.totalGames, playerForm, opponentForm);
    
    // Generate strategy recommendation
    const strategy = this.generateStrategyRecommendation(winProbability, headToHead, playerForm);

    // Store prediction for accuracy tracking
    await this.storePrediction(playerId, opponentId, tournamentId, {
      winProbability,
      confidence,
      factors
    });

    return {
      winProbability: Math.round(winProbability * 100),
      confidence: Math.round(confidence),
      factors,
      recommendedStrategy: strategy
    };
  }

  // Trend Analysis
  async analyzeTrends(playerId: string, tournamentId?: string): Promise<{
    skillTrend: { direction: 'improving' | 'declining' | 'stable'; percentage: number };
    gameVolumeTrend: { direction: 'increasing' | 'decreasing' | 'stable'; change: number };
    strengthsImproving: string[];
    areasForImprovement: string[];
  }> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Get performance data for trend analysis
    const recentPerformance = await this.getPerformanceInPeriod(playerId, last30Days, tournamentId);
    const previousPerformance = await this.getPerformanceInPeriod(playerId, last60Days, last30Days, tournamentId);

    // Calculate skill trend
    const skillImprovement = recentPerformance.averageScore - previousPerformance.averageScore;
    const skillPercentage = Math.round((skillImprovement / previousPerformance.averageScore) * 100);
    
    let skillDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (skillPercentage > 5) skillDirection = 'improving';
    else if (skillPercentage < -5) skillDirection = 'declining';

    // Calculate game volume trend
    const volumeChange = recentPerformance.gamesPlayed - previousPerformance.gamesPlayed;
    let volumeDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (volumeChange > 2) volumeDirection = 'increasing';
    else if (volumeChange < -2) volumeDirection = 'decreasing';

    // Identify improving strengths and areas for improvement
    const strengthsImproving = await this.identifyImprovingStrengths(playerId, tournamentId);
    const areasForImprovement = await this.identifyAreasForImprovement(playerId, tournamentId);

    return {
      skillTrend: {
        direction: skillDirection,
        percentage: Math.abs(skillPercentage)
      },
      gameVolumeTrend: {
        direction: volumeDirection,
        change: Math.abs(volumeChange)
      },
      strengthsImproving,
      areasForImprovement
    };
  }

  // Milestone Tracking
  async trackMilestones(playerId: string, tournamentId?: string): Promise<{
    activeMilestones: Array<{
      type: string;
      current: number;
      target: number;
      progress: number;
      description: string;
    }>;
    recentlyAchieved: Array<{
      type: string;
      achievedAt: Date;
      description: string;
    }>;
  }> {
    const playerStats = await this.getPlayerStats(playerId, tournamentId);
    
    // Define milestone targets
    const milestoneTargets = [
      { type: 'total_games', target: Math.ceil(playerStats.gamesPlayed / 50) * 50 + 50, description: 'Total Games Played' },
      { type: 'win_streak', target: playerStats.longestWinStreak + 5, description: 'Longest Win Streak' },
      { type: 'total_wins', target: Math.ceil(playerStats.wins / 25) * 25 + 25, description: 'Total Wins' },
      { type: 'perfect_scores', target: playerStats.perfectScores + 3, description: 'Perfect Scores (12 points)' },
      { type: 'average_score', target: Math.ceil(playerStats.averageScore) + 1, description: 'Average Score per Game' }
    ];

    const activeMilestones = milestoneTargets.map(milestone => ({
      type: milestone.type,
      current: this.getCurrentValue(milestone.type, playerStats),
      target: milestone.target,
      progress: Math.round((this.getCurrentValue(milestone.type, playerStats) / milestone.target) * 100),
      description: milestone.description
    }));

    // Get recently achieved milestones
    const recentlyAchieved = await db
      .select()
      .from(playerMilestones)
      .where(
        and(
          eq(playerMilestones.playerId, playerId),
          eq(playerMilestones.isAchieved, true),
          tournamentId ? eq(playerMilestones.tournamentId, tournamentId) : sql`1=1`,
          gte(playerMilestones.achievedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        )
      )
      .orderBy(desc(playerMilestones.achievedAt));

    return {
      activeMilestones,
      recentlyAchieved: recentlyAchieved.map(m => ({
        type: m.milestoneType,
        achievedAt: m.achievedAt!,
        description: `Reached ${m.targetValue} ${m.milestoneType.replace('_', ' ')}`
      }))
    };
  }

  // Player Recommendations
  async generatePlayerRecommendations(playerId: string, tournamentId?: string): Promise<{
    similarSkillPlayers: Array<{
      id: string;
      name: string;
      reason: string;
      matchScore: number;
    }>;
    learningOpportunities: Array<{
      id: string;
      name: string;
      reason: string;
      skillGap: number;
    }>;
    goodMatches: Array<{
      id: string;
      name: string;
      reason: string;
      competitiveness: number;
    }>;
  }> {
    const playerStats = await this.getPlayerStats(playerId, tournamentId);
    
    // Find players with similar skill levels
    const similarSkillPlayers = await this.findSimilarSkillPlayers(playerId, playerStats, tournamentId);
    
    // Find learning opportunities (slightly stronger players)
    const learningOpportunities = await this.findLearningOpportunities(playerId, playerStats, tournamentId);
    
    // Find good competitive matches
    const goodMatches = await this.findGoodMatches(playerId, playerStats, tournamentId);

    return {
      similarSkillPlayers,
      learningOpportunities,
      goodMatches
    };
  }

  // Helper methods
  private async getPlayerGamesByDayType(playerId: string, dayType: 'weekend' | 'weekday', tournamentId?: string) {
    const games = await db
      .select({
        gameId: gameParticipants.gameId,
        isWinner: gameParticipants.isWinner,
        score: gameParticipants.score,
        createdAt: games.createdAt
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );

    return games.filter(game => {
      const dayOfWeek = new Date(game.createdAt).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return dayType === 'weekend' ? isWeekend : !isWeekend;
    });
  }

  private calculateWinRate(games: any[]): number {
    if (games.length === 0) return 0;
    const wins = games.filter(g => g.isWinner).length;
    return wins / games.length;
  }

  private async getTimeOfDayPerformance(playerId: string, tournamentId?: string) {
    const games = await db
      .select({
        isWinner: gameParticipants.isWinner,
        createdAt: games.createdAt
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );

    const timeSlots = {
      morning: { wins: 0, total: 0 },
      afternoon: { wins: 0, total: 0 },
      evening: { wins: 0, total: 0 },
      night: { wins: 0, total: 0 }
    };

    games.forEach(game => {
      const hour = new Date(game.createdAt).getHours();
      let slot: keyof typeof timeSlots;
      
      if (hour >= 6 && hour < 12) slot = 'morning';
      else if (hour >= 12 && hour < 18) slot = 'afternoon';
      else if (hour >= 18 && hour < 22) slot = 'evening';
      else slot = 'night';

      timeSlots[slot].total++;
      if (game.isWinner) timeSlots[slot].wins++;
    });

    let bestTime = 'morning';
    let bestWinRate = 0;
    
    Object.entries(timeSlots).forEach(([time, stats]) => {
      if (stats.total > 0) {
        const winRate = stats.wins / stats.total;
        if (winRate > bestWinRate) {
          bestWinRate = winRate;
          bestTime = time;
        }
      }
    });

    const averageWinRate = games.length > 0 ? games.filter(g => g.isWinner).length / games.length : 0;
    const improvement = bestWinRate - averageWinRate;

    return {
      bestTime,
      improvement: Math.round(improvement * 100),
      description: `You perform ${Math.round(improvement * 100)}% better during ${bestTime} hours`
    };
  }

  private async calculateMonthlyImprovement(playerId: string, tournamentId?: string): Promise<number> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthGames = await this.getPlayerGamesInPeriod(playerId, lastMonth, thisMonth, tournamentId);
    const thisMonthGames = await this.getPlayerGamesInPeriod(playerId, thisMonth, now, tournamentId);

    if (lastMonthGames.length === 0 || thisMonthGames.length === 0) return 0;

    const lastMonthAvg = lastMonthGames.reduce((sum, g) => sum + Number(g.score), 0) / lastMonthGames.length;
    const thisMonthAvg = thisMonthGames.reduce((sum, g) => sum + Number(g.score), 0) / thisMonthGames.length;

    return Math.round(((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100);
  }

  private async analyzeOpponentPerformance(playerId: string, tournamentId?: string): Promise<string[]> {
    const insights: string[] = [];
    
    // Analyze performance against different skill levels
    const opponentStats = await this.getOpponentAnalysis(playerId, tournamentId);
    
    if (opponentStats.strongerOpponents.winRate > 0.3) {
      insights.push(`You compete well against stronger players (${Math.round(opponentStats.strongerOpponents.winRate * 100)}% win rate)`);
    }
    
    if (opponentStats.similarOpponents.winRate > 0.6) {
      insights.push(`You dominate against players of similar skill level`);
    }
    
    if (opponentStats.weakerOpponents.winRate < 0.8) {
      insights.push(`Focus on consistency against weaker opponents`);
    }

    return insights;
  }

  private async getHeadToHeadStats(playerId: string, opponentId: string, tournamentId?: string) {
    const games = await db
      .select({
        playerResult: gameParticipants.isWinner,
        gameId: gameParticipants.gameId
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );

    // Get opponent results for the same games
    const opponentGames = await db
      .select({
        opponentResult: gameParticipants.isWinner,
        gameId: gameParticipants.gameId
      })
      .from(gameParticipants)
      .where(eq(gameParticipants.playerId, opponentId));

    // Match up the games
    const headToHeadGames = games.filter(game => 
      opponentGames.some(oppGame => oppGame.gameId === game.gameId)
    );

    const wins = headToHeadGames.filter(g => g.playerResult).length;
    const losses = headToHeadGames.length - wins;

    return {
      wins,
      losses,
      totalGames: headToHeadGames.length
    };
  }

  private async getRecentForm(playerId: string, tournamentId?: string): Promise<number> {
    const recentGames = await db
      .select({
        isWinner: gameParticipants.isWinner
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`,
          gte(games.createdAt, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) // Last 14 days
        )
      )
      .orderBy(desc(games.createdAt))
      .limit(10);

    if (recentGames.length === 0) return 0.5;
    
    const wins = recentGames.filter(g => g.isWinner).length;
    return wins / recentGames.length;
  }

  private async getTournamentAdvantage(playerId: string, opponentId: string, tournamentId?: string): Promise<number> {
    if (!tournamentId) return 0;
    
    // Calculate how well each player performs in this specific tournament
    const playerTournamentWinRate = await this.getPlayerTournamentWinRate(playerId, tournamentId);
    const opponentTournamentWinRate = await this.getPlayerTournamentWinRate(opponentId, tournamentId);
    
    return (playerTournamentWinRate - opponentTournamentWinRate) / 2;
  }

  private async getExperienceAdvantage(playerId: string, opponentId: string, tournamentId?: string): Promise<number> {
    const playerGames = await this.getPlayerGameCount(playerId, tournamentId);
    const opponentGames = await this.getPlayerGameCount(opponentId, tournamentId);
    
    const experienceDiff = playerGames - opponentGames;
    // Normalize to -0.1 to 0.1 range
    return Math.max(-0.1, Math.min(0.1, experienceDiff / 1000));
  }

  private calculatePredictionConfidence(headToHeadGames: number, playerForm: number, opponentForm: number): number {
    let confidence = 50; // Base confidence
    
    // More head-to-head data increases confidence
    confidence += Math.min(30, headToHeadGames * 5);
    
    // Clear form differences increase confidence
    const formDifference = Math.abs(playerForm - opponentForm);
    confidence += formDifference * 20;
    
    return Math.min(95, confidence);
  }

  private generateStrategyRecommendation(winProbability: number, headToHead: any, playerForm: number): string {
    if (winProbability > 0.7) {
      return "Play your normal game - you have a strong advantage. Stay focused and avoid overconfidence.";
    } else if (winProbability < 0.3) {
      return "Challenge yourself - focus on learning and improving. Play aggressively to find opportunities.";
    } else if (headToHead.totalGames > 3) {
      return "This should be a close match. Adapt your strategy based on what worked in previous games.";
    } else if (playerForm > 0.6) {
      return "You're in good form - trust your instincts and play with confidence.";
    } else {
      return "Focus on fundamentals and consistent play. This is a good opportunity to test your skills.";
    }
  }

  private async storePrediction(playerId: string, opponentId: string, tournamentId: string | undefined, prediction: any) {
    await db.insert(playerPredictions).values({
      playerId,
      opponentId,
      tournamentId,
      predictionType: 'match_outcome',
      confidence: prediction.confidence.toString(),
      prediction: prediction
    });
  }

  private async getPerformanceInPeriod(playerId: string, startDate: Date, endDate?: Date, tournamentId?: string) {
    const games = await db
      .select({
        score: gameParticipants.score,
        isWinner: gameParticipants.isWinner
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          gte(games.createdAt, startDate),
          endDate ? lt(games.createdAt, endDate) : sql`1=1`,
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );

    const averageScore = games.length > 0 
      ? games.reduce((sum, g) => sum + Number(g.score), 0) / games.length 
      : 0;

    return {
      gamesPlayed: games.length,
      averageScore,
      winRate: games.length > 0 ? games.filter(g => g.isWinner).length / games.length : 0
    };
  }

  private async identifyImprovingStrengths(playerId: string, tournamentId?: string): Promise<string[]> {
    // This would analyze trends in specific game aspects
    return [
      "Scoring consistency has improved",
      "Performance under pressure is stronger",
      "Game strategy is more effective"
    ];
  }

  private async identifyAreasForImprovement(playerId: string, tournamentId?: string): Promise<string[]> {
    return [
      "Focus on maintaining concentration in long games",
      "Work on comeback strategies when behind",
      "Practice defensive play techniques"
    ];
  }

  private async getPlayerStats(playerId: string, tournamentId?: string) {
    const games = await db
      .select({
        score: gameParticipants.score,
        isWinner: gameParticipants.isWinner,
        gameId: gameParticipants.gameId
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );

    const wins = games.filter(g => g.isWinner).length;
    const perfectScores = games.filter(g => Number(g.score) === 12).length;
    const averageScore = games.length > 0 
      ? games.reduce((sum, g) => sum + Number(g.score), 0) / games.length 
      : 0;

    // Calculate longest win streak
    let longestWinStreak = 0;
    let currentStreak = 0;
    
    // This would need to be calculated based on game chronological order
    // For now, using a simplified calculation
    longestWinStreak = Math.floor(wins * 0.3); // Approximation

    return {
      gamesPlayed: games.length,
      wins,
      losses: games.length - wins,
      winRate: games.length > 0 ? wins / games.length : 0,
      averageScore,
      perfectScores,
      longestWinStreak
    };
  }

  private getCurrentValue(milestoneType: string, stats: any): number {
    switch (milestoneType) {
      case 'total_games': return stats.gamesPlayed;
      case 'win_streak': return stats.longestWinStreak;
      case 'total_wins': return stats.wins;
      case 'perfect_scores': return stats.perfectScores;
      case 'average_score': return Math.round(stats.averageScore * 10) / 10;
      default: return 0;
    }
  }

  private async findSimilarSkillPlayers(playerId: string, playerStats: any, tournamentId?: string) {
    // Find players with similar win rates and average scores
    const allPlayers = await db
      .select({
        id: players.id,
        name: players.name
      })
      .from(players)
      .where(sql`${players.id} != ${playerId}`);

    const similarPlayers = [];
    
    for (const player of allPlayers.slice(0, 10)) { // Limit for performance
      const stats = await this.getPlayerStats(player.id, tournamentId);
      
      if (stats.gamesPlayed >= 5) { // Minimum games for comparison
        const winRateDiff = Math.abs(stats.winRate - playerStats.winRate);
        const scoreDiff = Math.abs(stats.averageScore - playerStats.averageScore);
        
        if (winRateDiff < 0.15 && scoreDiff < 1.5) { // Similar skill thresholds
          const matchScore = 100 - (winRateDiff * 300 + scoreDiff * 30);
          similarPlayers.push({
            id: player.id,
            name: player.name,
            reason: `Similar win rate (${Math.round(stats.winRate * 100)}%) and average score (${stats.averageScore.toFixed(1)})`,
            matchScore: Math.round(matchScore)
          });
        }
      }
    }

    return similarPlayers.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  private async findLearningOpportunities(playerId: string, playerStats: any, tournamentId?: string) {
    const allPlayers = await db
      .select({
        id: players.id,
        name: players.name
      })
      .from(players)
      .where(sql`${players.id} != ${playerId}`);

    const learningOpportunities = [];
    
    for (const player of allPlayers.slice(0, 10)) {
      const stats = await this.getPlayerStats(player.id, tournamentId);
      
      if (stats.gamesPlayed >= 5) {
        const skillGap = (stats.winRate - playerStats.winRate) + (stats.averageScore - playerStats.averageScore) / 12;
        
        if (skillGap > 0.1 && skillGap < 0.3) { // Moderately stronger
          learningOpportunities.push({
            id: player.id,
            name: player.name,
            reason: `Stronger player (${Math.round(stats.winRate * 100)}% win rate) - good learning opportunity`,
            skillGap: Math.round(skillGap * 100)
          });
        }
      }
    }

    return learningOpportunities.slice(0, 3);
  }

  private async findGoodMatches(playerId: string, playerStats: any, tournamentId?: string) {
    const allPlayers = await db
      .select({
        id: players.id,
        name: players.name
      })
      .from(players)
      .where(sql`${players.id} != ${playerId}`);

    const goodMatches = [];
    
    for (const player of allPlayers.slice(0, 10)) {
      const stats = await this.getPlayerStats(player.id, tournamentId);
      
      if (stats.gamesPlayed >= 5) {
        const competitiveness = 100 - Math.abs(stats.winRate - playerStats.winRate) * 200;
        
        if (competitiveness > 70) {
          goodMatches.push({
            id: player.id,
            name: player.name,
            reason: "Evenly matched - should be a competitive game",
            competitiveness: Math.round(competitiveness)
          });
        }
      }
    }

    return goodMatches.sort((a, b) => b.competitiveness - a.competitiveness).slice(0, 5);
  }

  // Additional helper methods
  private async getPlayerGamesInPeriod(playerId: string, startDate: Date, endDate: Date, tournamentId?: string) {
    return await db
      .select({
        score: gameParticipants.score,
        isWinner: gameParticipants.isWinner
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          gte(games.createdAt, startDate),
          lt(games.createdAt, endDate),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );
  }

  private async getOpponentAnalysis(playerId: string, tournamentId?: string) {
    // Simplified implementation - would need more complex analysis in production
    return {
      strongerOpponents: { winRate: 0.35 },
      similarOpponents: { winRate: 0.65 },
      weakerOpponents: { winRate: 0.85 }
    };
  }

  private async getPlayerTournamentWinRate(playerId: string, tournamentId: string): Promise<number> {
    const games = await db
      .select({
        isWinner: gameParticipants.isWinner
      })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          eq(games.tournamentId, tournamentId)
        )
      );

    if (games.length === 0) return 0.5;
    return games.filter(g => g.isWinner).length / games.length;
  }

  private async getPlayerGameCount(playerId: string, tournamentId?: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(gameParticipants)
      .innerJoin(games, eq(gameParticipants.gameId, games.id))
      .where(
        and(
          eq(gameParticipants.playerId, playerId),
          tournamentId ? eq(games.tournamentId, tournamentId) : sql`1=1`
        )
      );

    return Number(result[0]?.count || 0);
  }
}

export const playerAnalyticsService = new PlayerAnalyticsService();