import { db } from "./db";
import { leaderboardSnapshots, tournaments, players, teams } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { LeaderboardEntry, TeamLeaderboardEntry } from "@shared/schema";

export async function captureLeaderboardSnapshot(
  tournamentId: string,
  formulaId?: string
): Promise<void> {
  try {
    console.log(`📸 Capturing leaderboard snapshot for tournament ${tournamentId}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    // Check if we already have a snapshot for today
    const existingSnapshot = await db.select()
      .from(leaderboardSnapshots)
      .where(and(
        eq(leaderboardSnapshots.tournamentId, tournamentId),
        sql`DATE(${leaderboardSnapshots.snapshotDate}) = DATE(${today})`,
        formulaId ? eq(leaderboardSnapshots.formulaId, formulaId) : sql`${leaderboardSnapshots.formulaId} IS NULL`
      ))
      .limit(1);

    if (existingSnapshot.length > 0) {
      console.log(`📸 Snapshot already exists for today, skipping...`);
      return;
    }

    // Get current player leaderboard
    const playerLeaderboard = await calculateCurrentPlayerLeaderboard(tournamentId, formulaId);
    
    // Get current team leaderboard  
    const teamLeaderboard = await calculateCurrentTeamLeaderboard(tournamentId, formulaId);

    // Insert player snapshots
    if (playerLeaderboard.length > 0) {
      const playerSnapshots = playerLeaderboard.map((entry, index) => ({
        tournamentId,
        playerId: entry.id,
        teamId: null,
        position: index + 1,
        points: entry.points.toString(),
        snapshotDate: today,
        snapshotType: 'player' as const,
        formulaId: formulaId || null,
      }));

      await db.insert(leaderboardSnapshots).values(playerSnapshots);
      console.log(`📸 Captured ${playerSnapshots.length} player positions`);
    }

    // Insert team snapshots
    if (teamLeaderboard.length > 0) {
      const teamSnapshots = teamLeaderboard.map((entry, index) => ({
        tournamentId,
        playerId: null,
        teamId: entry.id.toString(),
        position: index + 1,
        points: entry.points.toString(),
        snapshotDate: today,
        snapshotType: 'team' as const,
        formulaId: formulaId || null,
      }));

      await db.insert(leaderboardSnapshots).values(teamSnapshots);
      console.log(`📸 Captured ${teamSnapshots.length} team positions`);
    }

  } catch (error) {
    console.error('Error capturing leaderboard snapshot:', error);
  }
}

export async function getMovementData(
  tournamentId: string,
  snapshotType: 'player' | 'team',
  formulaId?: string
): Promise<Map<string, { direction: 'up' | 'down' | 'same'; positions: number }>> {
  try {
    const movementMap = new Map();

    // Get the most recent snapshot (previous positions)
    const previousSnapshots = await db.select()
      .from(leaderboardSnapshots)
      .where(and(
        eq(leaderboardSnapshots.tournamentId, tournamentId),
        eq(leaderboardSnapshots.snapshotType, snapshotType),
        formulaId ? eq(leaderboardSnapshots.formulaId, formulaId) : sql`${leaderboardSnapshots.formulaId} IS NULL`
      ))
      .orderBy(desc(leaderboardSnapshots.snapshotDate))
      .limit(100); // Get recent snapshots

    if (previousSnapshots.length === 0) {
      return movementMap;
    }

    // Group by entity (player/team) and get their most recent position
    const latestPositions = new Map<string, number>();
    
    for (const snapshot of previousSnapshots) {
      const entityId = snapshotType === 'player' ? snapshot.playerId! : snapshot.teamId!;
      
      if (!latestPositions.has(entityId)) {
        latestPositions.set(entityId, snapshot.position);
      }
    }

    // Get current leaderboard to compare
    const currentLeaderboard = snapshotType === 'player' 
      ? await calculateCurrentPlayerLeaderboard(tournamentId, formulaId)
      : await calculateCurrentTeamLeaderboard(tournamentId, formulaId);

    // Calculate movement for each entity
    currentLeaderboard.forEach((entry, currentIndex) => {
      const currentPosition = currentIndex + 1;
      const entityId = entry.id.toString();
      const previousPosition = latestPositions.get(entityId);

      if (previousPosition !== undefined) {
        const positionChange = previousPosition - currentPosition;
        
        if (positionChange > 0) {
          // Moved up (lower position number = better)
          movementMap.set(entityId, {
            direction: 'up' as const,
            positions: Math.abs(positionChange)
          });
        } else if (positionChange < 0) {
          // Moved down (higher position number = worse)
          movementMap.set(entityId, {
            direction: 'down' as const,
            positions: Math.abs(positionChange)
          });
        } else {
          // No change
          movementMap.set(entityId, {
            direction: 'same' as const,
            positions: 0
          });
        }
      }
    });

    return movementMap;
  } catch (error) {
    console.error('Error getting movement data:', error);
    return new Map();
  }
}

// Import and use existing leaderboard calculation functions
import { calculatePlayerLeaderboardUUID, calculateTeamLeaderboardUUID } from "./leaderboard-uuid-fix";

async function calculateCurrentPlayerLeaderboard(tournamentId: string, formulaId?: string): Promise<any[]> {
  try {
    return await calculatePlayerLeaderboardUUID(tournamentId);
  } catch (error) {
    console.error('Error calculating current player leaderboard:', error);
    return [];
  }
}

async function calculateCurrentTeamLeaderboard(tournamentId: string, formulaId?: string): Promise<any[]> {
  try {
    return await calculateTeamLeaderboardUUID(tournamentId);
  } catch (error) {
    console.error('Error calculating current team leaderboard:', error);
    return [];
  }
}