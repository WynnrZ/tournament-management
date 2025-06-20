// Quick fix for UUID-based leaderboard calculation
import { db } from "./db";
import { teams, gameParticipants, games, teamMembers, players, leaderboardFormulas } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { LeaderboardEntry, TeamLeaderboardEntry } from "@shared/schema";
import { calculateFormulaPoints } from "./formula-calculator";

// Helper function to calculate points using any custom formula rules
async function calculatePlayerPointsWithFormula(playerId: string, tournamentId: string, wins: number, draws: number, filters?: { year?: string, month?: string }): Promise<{ points: number, specialRules: any[] }> {
  // Get the Dominology formula for this tournament
  const { pool } = await import("./db");
  const formulaResult = await pool.query(
    `SELECT formula FROM leaderboard_formulas WHERE name = 'Dominology'`
  );
  
  if (!formulaResult.rows[0]) {
    return { points: (wins * 3) + (draws * 1), specialRules: [] };
  }
  
  const formulaData = formulaResult.rows[0].formula;
  console.log('🔍 Formula data type:', typeof formulaData);
  console.log('🔍 Formula data:', JSON.stringify(formulaData, null, 2));
  
  // The formula is already parsed by Drizzle ORM, no need to parse again
  const formula = formulaData;
  let dateFilter = '';
  const queryParams = [playerId, tournamentId];
  let paramCount = 2;

  if (filters?.year) {
    paramCount++;
    dateFilter += ` AND EXTRACT(YEAR FROM g.date) = $${paramCount}`;
    queryParams.push(filters.year);
  }

  if (filters?.month) {
    paramCount++;
    dateFilter += ` AND EXTRACT(MONTH FROM g.date) = $${paramCount}`;
    queryParams.push(filters.month);
  }

  // Check for special scoring rules (like 12-0 bonus)
  const appliedRules = [];
  let totalPoints = 0;
  let regularWins = wins;

  // Find custom rules that aren't standard win/draw/loss
  const specialRules = formula.rules.filter(rule => 
    !['win-rule', 'draw-rule', 'loss-rule'].includes(rule.id)
  );

  for (const rule of specialRules) {
    if (rule.condition.type === 'winner_score' && rule.condition.operator === 'equals') {
      const specialScore = rule.condition.value;
      
      // Build the special query with correct parameter order
      const specialParams = [playerId, tournamentId, specialScore.toString() + '.00'];
      let specialParamCount = 3;
      let specialDateFilter = '';

      if (filters?.year) {
        specialParamCount++;
        specialDateFilter += ` AND EXTRACT(YEAR FROM g.date) = $${specialParamCount}`;
        specialParams.push(filters.year);
      }

      if (filters?.month) {
        specialParamCount++;
        specialDateFilter += ` AND EXTRACT(MONTH FROM g.date) = $${specialParamCount}`;
        specialParams.push(filters.month);
      }

      const specialQuery = `SELECT COUNT(DISTINCT g.id) as special_wins
         FROM game_participants gp
         JOIN games g ON gp.game_id = g.id
         WHERE gp.player_id = $1 
         AND g.tournament_id = $2 
         AND gp.score = $3
         AND gp.is_winner = true${specialDateFilter}`;
      
      console.log(`🔍 Special rules query for score ${specialScore}:`, specialQuery);
      console.log(`🔍 Query params:`, specialParams);
      
      const result = await pool.query(specialQuery, specialParams);
      
      const specialWins = parseInt(result.rows[0]?.special_wins || '0');
      console.log(`🔍 Special wins found for score ${specialScore}:`, specialWins);
      
      if (specialWins > 0) {
        const bonusPoints = specialWins * rule.winnerPoints;
        const standardPoints = specialWins * formula.defaultWinnerPoints;
        const extraPoints = bonusPoints - standardPoints;
        
        appliedRules.push({
          type: 'bonus_victory',
          description: `${specialScore}-0 victories: ${specialWins} games × ${rule.winnerPoints} points (+${extraPoints} bonus points)`,
          count: specialWins,
          bonusPoints: extraPoints
        });
        totalPoints += bonusPoints;
        regularWins -= specialWins; // Don't double count
      }
    }
  }

  // Add regular wins and draws
  totalPoints += (regularWins * 3) + (draws * 1);

  return { points: totalPoints, specialRules: appliedRules };
}

export async function calculateTeamLeaderboardUUID(tournamentId: string, filters?: { year?: string, month?: string }): Promise<TeamLeaderboardEntry[]> {
  console.log('🎯 Calculating team leaderboard for tournament:', tournamentId);
  
  // Get all teams for this tournament
  const tournamentTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
  
  console.log('📊 Found', tournamentTeams.length, 'teams');
  
  // Get all games for this tournament
  const tournamentGames = await db
    .select()
    .from(games)
    .where(eq(games.tournamentId, tournamentId));
  
  console.log('🎮 Found', tournamentGames.length, 'games');
  
  if (tournamentGames.length === 0 || tournamentTeams.length === 0) {
    return [];
  }
  
  // Get all game participants for team games
  const gameIds = tournamentGames.map(g => g.id);
  const allParticipants = await db
    .select()
    .from(gameParticipants)
    .where(inArray(gameParticipants.gameId, gameIds));
  
  // Calculate stats for each team
  const teamStats = new Map<string, {
    id: string;
    name: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    memberCount: number;
  }>();
  
  // Get actual member counts for each team
  const teamMemberCounts = await db
    .select({
      teamId: teamMembers.teamId,
      memberCount: sql<number>`count(*)`.as('memberCount')
    })
    .from(teamMembers)
    .where(sql`${teamMembers.teamId} IN (${sql.join(tournamentTeams.map(t => sql`${t.id}`), sql`, `)})`)
    .groupBy(teamMembers.teamId);
  
  const memberCountMap = new Map(teamMemberCounts.map(tc => [tc.teamId, tc.memberCount]));

  // Initialize all teams
  for (const team of tournamentTeams) {
    teamStats.set(team.id, {
      id: team.id,
      name: team.name,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      memberCount: memberCountMap.get(team.id) || 0
    });
  }
  
  // Build date filtering conditions
  let dateFilter = '';
  const queryParams = [tournamentId];
  let paramCount = 1;

  if (filters?.year) {
    paramCount++;
    dateFilter += ` AND EXTRACT(YEAR FROM g.date) = $${paramCount}`;
    queryParams.push(filters.year);
  }

  if (filters?.month) {
    paramCount++;
    dateFilter += ` AND EXTRACT(MONTH FROM g.date) = $${paramCount}`;
    queryParams.push(filters.month);
  }

  // Process participants using pool query to fix parameter issue
  const { pool } = await import("./db");
  const rawResults = await pool.query(
    `SELECT 
      gp.team_id,
      COUNT(*) as games_played,
      SUM(CASE WHEN gp.is_winner = true THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN gp.is_winner = false THEN 1 ELSE 0 END) as losses,
      SUM(CASE 
        WHEN gp.score = '6.00' AND EXISTS (
          SELECT 1 FROM game_participants gp2 
          WHERE gp2.game_id = gp.game_id 
          AND gp2.id != gp.id 
          AND gp2.score::numeric BETWEEN 1 AND 5
        ) THEN 1
        WHEN gp.score::numeric BETWEEN 1 AND 5 AND EXISTS (
          SELECT 1 FROM game_participants gp2 
          WHERE gp2.game_id = gp.game_id 
          AND gp2.id != gp.id 
          AND gp2.score = '6.00'
        ) THEN 1
        ELSE 0 
      END) as draws
    FROM game_participants gp
    JOIN games g ON gp.game_id = g.id
    WHERE g.tournament_id = $1 AND gp.team_id IS NOT NULL${dateFilter}
    GROUP BY gp.team_id`,
    queryParams
  );
  
  // Update team stats with results (including 12-0 bonus calculations)
  for (const row of rawResults.rows) {
    const teamId = row.team_id;
    const gamesPlayed = parseInt(row.games_played);
    const wins = parseInt(row.wins);
    const losses = parseInt(row.losses);
    const draws = parseInt(row.draws || 0);
    
    const teamStat = teamStats.get(teamId);
    if (teamStat) {
      teamStat.gamesPlayed = gamesPlayed;
      teamStat.wins = wins;
      teamStat.losses = losses;
      teamStat.draws = draws;
      
      // Calculate 12-0 bonus points
      let dateFilter = '';
      const bonusParams = [teamId, tournamentId];
      let paramCount = 2;

      if (filters?.year) {
        paramCount++;
        dateFilter += ` AND EXTRACT(YEAR FROM g.date) = $${paramCount}`;
        bonusParams.push(filters.year);
      }
      if (filters?.month) {
        paramCount++;
        dateFilter += ` AND EXTRACT(MONTH FROM g.date) = $${paramCount}`;
        bonusParams.push(filters.month);
      }

      const bonusResult = await pool.query(
        `SELECT COUNT(*) as bonus_wins
         FROM game_participants gp
         JOIN games g ON gp.game_id = g.id
         WHERE gp.team_id = $1 AND g.tournament_id = $2 
         AND gp.score = '12.00' AND gp.is_winner = true${dateFilter}`,
        bonusParams
      );
      
      const bonusWins = parseInt(bonusResult.rows[0]?.bonus_wins || '0');
      const regularWins = wins - bonusWins;
      
      // Dominology: Regular wins = 3pts, 12-0 wins = 9pts, draws = 1pt
      teamStat.points = (regularWins * 3) + (bonusWins * 9) + (draws * 1);
    }
  }
  
  // Convert to leaderboard entries and sort
  const leaderboard = Array.from(teamStats.values())
    .filter(team => team.gamesPlayed > 0)
    .sort((a, b) => {
      // Sort by points first, then by wins, then by games played
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gamesPlayed - a.gamesPlayed;
    })
    .map((team, index) => ({
      id: team.id,
      name: team.name,
      gamesPlayed: team.gamesPlayed,
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      points: team.points,
      position: index + 1,
      memberCount: team.memberCount,
      movement: null
    }));
  
  console.log('🏆 Generated leaderboard with', leaderboard.length, 'teams');
  
  return leaderboard;
}

export async function calculatePlayerLeaderboardUUID(tournamentId: string, filters?: { year?: string, month?: string }): Promise<LeaderboardEntry[]> {
  console.log('🎯 Calculating individual leaderboard for tournament:', tournamentId);
  
  try {
    // Get player stats from team participation since games are recorded as team games
    const { pool } = await import("./db");
    
    // Build date filtering conditions
    let dateFilter = '';
    const queryParams = [tournamentId];
    let paramCount = 1;

    if (filters?.year) {
      paramCount++;
      dateFilter += ` AND EXTRACT(YEAR FROM g.date) = $${paramCount}`;
      queryParams.push(filters.year);
    }

    if (filters?.month) {
      paramCount++;
      dateFilter += ` AND EXTRACT(MONTH FROM g.date) = $${paramCount}`;
      queryParams.push(filters.month);
    }

    const result = await pool.query(
      `SELECT 
        p.id as player_id,
        p.name as player_name,
        COUNT(DISTINCT gp.game_id) as games_played,
        COUNT(DISTINCT CASE WHEN gp.is_winner = true THEN gp.game_id END) as wins,
        COUNT(DISTINCT CASE WHEN gp.is_winner = false THEN gp.game_id END) as losses
      FROM game_participants gp
      JOIN team_members tm ON gp.team_id = tm.team_id
      JOIN players p ON tm.player_id = p.id
      JOIN games g ON gp.game_id = g.id
      WHERE g.tournament_id = $1 AND gp.team_id IS NOT NULL${dateFilter}
      GROUP BY p.id, p.name
      ORDER BY wins DESC, games_played DESC`,
      queryParams
    );
    
    // Convert to leaderboard entries with simple point calculation
    const leaderboard = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      const wins = parseInt(row.wins);
      const losses = parseInt(row.losses);
      const gamesPlayed = parseInt(row.games_played);
      
      // Simple point calculation: 3 points per win
      const points = wins * 3;
      
      leaderboard.push({
        id: row.player_id,
        name: row.player_name,
        gamesPlayed: gamesPlayed,
        wins: wins,
        losses: losses,
        draws: 0,
        points: points,
        position: 0, // Will be set after sorting
        movement: null,
        specialEvents: []
      });
    }
    
    // Sort by points (descending), then by wins, then by games played
    leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gamesPlayed - a.gamesPlayed;
    });
    
    // Set positions after sorting
    leaderboard.forEach((entry, index) => {
      entry.position = index + 1;
    });
    
    console.log('🏆 Generated individual leaderboard with', leaderboard.length, 'players');
    
    return leaderboard;
  } catch (error) {
    console.error('Error calculating player leaderboard:', error);
    return [];
  }
}