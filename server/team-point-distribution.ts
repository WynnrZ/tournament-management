// Service to distribute team points to individual players when their team wins
import { db } from "./db";
import { players, games, gameParticipants, teams, teamMembers } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function distributeTeamPointsToPlayers(gameId: string): Promise<void> {
  try {
    console.log(`🎯 Distributing team points to individual players for game: ${gameId}`);
    
    // Get the game details
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    
    if (!game.length || game[0].gameType !== 'team') {
      console.log('❌ Game not found or not a team game');
      return;
    }
    
    const tournamentId = game[0].tournamentId;
    
    // Get all participants for this game
    const participants = await db
      .select()
      .from(gameParticipants)
      .where(eq(gameParticipants.gameId, gameId));
    
    console.log(`📊 Found ${participants.length} team participants`);
    
    // For each team participant, distribute points to individual team members
    for (const participant of participants) {
      if (!participant.teamId) continue;
      
      // Get all team members for this team
      const teamMembersList = await db
        .select({
          playerId: teamMembers.playerId,
          playerName: players.name
        })
        .from(teamMembers)
        .innerJoin(players, eq(players.id, teamMembers.playerId))
        .where(eq(teamMembers.teamId, participant.teamId));
      
      console.log(`👥 Distributing points to ${teamMembersList.length} members of team ${participant.teamId}`);
      
      // Calculate points based on team result
      const teamPoints = calculateTeamPoints(participant);
      
      // Create individual game participants for each team member
      for (const member of teamMembersList) {
        // Check if individual participant already exists
        const existingParticipant = await db
          .select()
          .from(gameParticipants)
          .where(and(
            eq(gameParticipants.gameId, gameId),
            eq(gameParticipants.playerId, member.playerId)
          ))
          .limit(1);
        
        if (existingParticipant.length === 0) {
          // Create new individual participant entry
          await db.insert(gameParticipants).values({
            gameId: gameId,
            playerId: member.playerId,
            teamId: null, // Individual entry, not team
            score: participant.score,
            isWinner: participant.isWinner,
            createdAt: new Date()
          });
          
          console.log(`✅ Added individual points for player ${member.playerName}: ${teamPoints} points`);
        }
      }
    }
    
    console.log('🎉 Team point distribution completed');
  } catch (error) {
    console.error('❌ Error distributing team points:', error);
  }
}

function calculateTeamPoints(participant: any): number {
  if (participant.isWinner) {
    // Check for 12-0 bonus
    if (participant.score === '12.00') {
      return 9; // Dominology 12-0 bonus
    }
    return 3; // Regular win
  } else if (participant.score && parseFloat(participant.score) > 0) {
    return 1; // Draw
  }
  return 0; // Loss
}