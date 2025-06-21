import { db } from "./db";
import { gameParticipants, games } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import type { LeaderboardFormula, LeaderboardEntry } from "@shared/schema";

export async function calculatePlayerLeaderboard(
  tournamentId: string, 
  players: any[], 
  formula?: LeaderboardFormula
): Promise<LeaderboardEntry[]> {
  console.log('🎯 Calculating leaderboard with formula:', formula?.name);
  
  // Get all games for this tournament
  const tournamentGames = await db
    .select()
    .from(games)
    .where(eq(games.tournamentId, tournamentId));
  
  if (tournamentGames.length === 0) {
    return players.map((player, index) => ({
      id: player.id,
      name: player.name,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0,
      position: index + 1,
      movement: null
    }));
  }
  
  // Get all game participants
  const gameIds = tournamentGames.map(g => g.id);
  const participants = await db
    .select()
    .from(gameParticipants)
    .where(inArray(gameParticipants.gameId, gameIds));
  
  console.log('📊 Processing', participants.length, 'participants');
  
  // Calculate stats for each player
  const playerStats = new Map<number, {
    id: number;
    name: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    specialEvents: Array<{
      description: string;
      points: number;
      opponent: string;
      gameScore: string;
    }>;
  }>();
  
  // Initialize all players
  players.forEach(player => {
    playerStats.set(player.id, {
      id: player.id,
      name: player.name,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0,
      specialEvents: []
    });
  });
  
  // Process each participant
  for (const participant of participants) {
    if (!participant.playerId) continue; // Skip team-only participants
    
    const stats = playerStats.get(participant.playerId);
    if (!stats) continue;
    
    stats.gamesPlayed++;
    
    if (participant.isWinner) {
      stats.wins++;
      
      // Apply your Dominology formula for winners
      if (formula && formula.formula) {
        const points = calculateDominologyPoints(participant, participants, formula);
        console.log(`🎯 Player ${participant.playerId} gets ${points} points (Dominology)`);
        stats.points += points;
        
        // Track special scoring events for highlighting
        if (points > 3) { // More than standard win points
          const opponent = participants.find(p => p.gameId === participant.gameId && !p.isWinner);
          stats.specialEvents.push({
            description: `Winner Score ${participant.score} = ${points} points`,
            points: points,
            opponent: opponent?.playerId ? `Player ${opponent.playerId}` : 'Unknown',
            gameScore: `${participant.score}-${opponent?.score || 0}`
          });
        }
      } else {
        stats.points += 1; // Default: 1 point for win
      }
    } else {
      stats.losses++;
      // Losers get 0 points in both default and Dominology systems
    }
  }
  
  // Sort by points and return
  const result = Array.from(playerStats.values())
    .sort((a, b) => b.points - a.points)
    .map((player, index) => ({
      id: player.id,
      name: player.name,
      gamesPlayed: player.gamesPlayed,
      wins: player.wins,
      losses: player.losses,
      points: player.points,
      position: index + 1,
      movement: null
    }));
  
  console.log('🏆 Final leaderboard:', result);
  return result;
}

function calculateDominologyPoints(
  participant: any, 
  allParticipants: any[], 
  formula: LeaderboardFormula
): number {
  // Find the opponent in this game
  const gameParticipants = allParticipants.filter(p => p.gameId === participant.gameId);
  if (gameParticipants.length !== 2) {
    console.log('⚠️ Game has', gameParticipants.length, 'participants, using default 1 point');
    return 1; // Default for non-standard games
  }
  
  const winner = gameParticipants.find(p => p.isWinner);
  const loser = gameParticipants.find(p => !p.isWinner);
  
  if (!winner || !loser) {
    console.log('⚠️ Could not find winner/loser, using default 1 point');
    return 1;
  }
  
  const scoreDiff = Number(winner.score) - Number(loser.score);
  console.log(`📊 Score differential: ${scoreDiff} (${winner.score} - ${loser.score})`);
  
  // Apply your Dominology formula rules
  if (formula.formula && formula.formula.rules) {
    for (const rule of formula.formula.rules) {
      const condition = rule.condition;
      let matches = false;
      
      switch (condition.operator) {
        case 'greater_than_or_equal':
          matches = scoreDiff >= condition.value;
          break;
        case 'less_than':
          matches = scoreDiff < condition.value;
          break;
        case 'equals':
          matches = scoreDiff === condition.value;
          break;
        // Add other operators as needed
      }
      
      if (matches) {
        console.log(`✅ Rule matched: ${condition.operator} ${condition.value} = ${rule.points} points`);
        return rule.points;
      }
    }
  }
  
  console.log('⚠️ No formula rule matched, using default 1 point');
  return 1; // Default if no rules match
}