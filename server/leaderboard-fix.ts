// This is a fixed version of the player leaderboard calculation
// that properly applies the Dominology formula

import { calculateFormulaPoints } from "./formula-calculator";
import { db } from "./db";
import { gameParticipants } from "@shared/schema";
import { inArray } from "drizzle-orm";

export async function getPlayerLeaderboardFixed(
  tournamentId: string, 
  formulaId: number | undefined,
  tournamentGames: any[],
  tournamentPlayers: any[],
  formula: any,
  getTeamMembers: (teamId: string) => Promise<any[]>
): Promise<any[]> {
  if (tournamentGames.length === 0 || tournamentPlayers.length === 0) {
    return [];
  }
  
  // Get game IDs
  const gameIds = tournamentGames.map(game => game.id);
  
  // Get all participants for these games
  const participantsData = await db
    .select()
    .from(gameParticipants)
    .where(inArray(gameParticipants.gameId, gameIds));
  
  // Structure to hold player stats
  const playerStats = new Map<number, {
    id: number;
    name: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    score: number;
  }>();
  
  // Initialize stats for all players
  tournamentPlayers.forEach(player => {
    playerStats.set(player.id, {
      id: player.id,
      name: player.name,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      score: 0
    });
  });
  
  // Process individual game participants
  for (const participant of participantsData) {
    // Skip team participants, we only want individual players here
    if (!participant.playerId) continue;
    
    const playerStat = playerStats.get(participant.playerId);
    if (playerStat) {
      // Count the game
      playerStat.gamesPlayed++;
      
      // Record win/loss
      if (participant.isWinner) {
        playerStat.wins++;
      } else {
        playerStat.losses++;
      }
      
      // *** THIS IS THE KEY FIX ***
      // Calculate points using formula if available
      if (formula) {
        const points = calculateFormulaPoints(participant.gameId, participant.isWinner, formula, participantsData);
        playerStat.score += points;
      } else {
        // Default: 1 point for win, 0 for loss
        playerStat.score += participant.isWinner ? 1 : 0;
      }
    }
  }
  
  // Process team game participants - attribute team results to individual players
  const teamGames = tournamentGames.filter(game => game.isTeamGame);
  if (teamGames.length > 0) {
    const teamGameIds = teamGames.map(game => game.id);
    
    // Get team participants for team games
    const teamParticipants = participantsData.filter(
      p => p.teamId !== null && teamGameIds.includes(p.gameId)
    );
    
    // Process team games to attribute to individual players
    for (const teamParticipant of teamParticipants) {
      if (!teamParticipant.teamId) continue;
      
      // Get team members
      const teamMembers = await getTeamMembers(teamParticipant.teamId);
      
      // Attribute team performance to each team member
      for (const member of teamMembers) {
        const playerStat = playerStats.get(member.id);
        if (playerStat) {
          // Count the game
          playerStat.gamesPlayed++;
          
          // Record win/loss
          if (teamParticipant.isWinner) {
            playerStat.wins++;
          } else {
            playerStat.losses++;
          }
          
          // *** THIS IS THE KEY FIX FOR TEAM GAMES TOO ***
          // Calculate points using formula if available
          if (formula) {
            const points = calculateFormulaPoints(teamParticipant.gameId, teamParticipant.isWinner, formula, participantsData);
            playerStat.score += points;
          } else {
            // Default: 1 point for win, 0 for loss
            playerStat.score += teamParticipant.isWinner ? 1 : 0;
          }
        }
      }
    }
  }
  
  // Convert to array and add ranking info
  const leaderboardEntries = Array.from(playerStats.values())
    .map(player => {
      return {
        ...player,
        avgScore: player.gamesPlayed > 0 ? player.score / player.gamesPlayed : 0,
        rank: 0 // Will be calculated after sorting
      };
    });
  
  // Sort by score (descending)
  leaderboardEntries.sort((a, b) => b.score - a.score);
  
  // Add rankings
  leaderboardEntries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  // Convert to the expected format
  return leaderboardEntries.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    gamesPlayed: entry.gamesPlayed,
    wins: entry.wins,
    losses: entry.losses,
    points: entry.score, // This is the key - using calculated points, not raw scores
    position: index + 1,
    movement: null // Can be calculated if needed
  }));
}