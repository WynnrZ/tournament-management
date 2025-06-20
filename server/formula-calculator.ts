import { LeaderboardFormula } from "@shared/schema";

export function calculateFormulaPoints(
  gameId: number, 
  isWinner: boolean, 
  formula: LeaderboardFormula, 
  allParticipants: any[]
): number {
  console.log('🎯 Formula calculation called:', { gameId, isWinner, hasFormula: !!formula });
  
  if (!formula || !formula.formula || !formula.formula.rules) {
    console.log('⚠️ No formula provided, using default scoring');
    // Default scoring: 1 point for win, 0 for loss
    return isWinner ? 1 : 0;
  }

  // Get both participants for this game to calculate score differential
  const gameParticipants = allParticipants.filter(p => p.gameId === gameId);
  if (gameParticipants.length !== 2) {
    return isWinner ? 1 : 0; // fallback
  }

  const winner = gameParticipants.find(p => p.isWinner);
  const loser = gameParticipants.find(p => !p.isWinner);
  if (!winner || !loser) {
    return isWinner ? 1 : 0; // fallback
  }

  const scoreDifferential = Number(winner.score) - Number(loser.score);
  const winnerScore = Number(winner.score);
  const loserScore = Number(loser.score);
  
  console.log('🎯 Game scores:', { winnerScore, loserScore, scoreDifferential });
  
  // Apply formula rules - sort by specificity (most specific conditions first)
  const rules = formula.formula.rules.slice().sort((a, b) => {
    // Custom rules (non-standard) should be checked first
    const aIsCustom = !['win-rule', 'draw-rule'].includes(a.id);
    const bIsCustom = !['win-rule', 'draw-rule'].includes(b.id);
    
    if (aIsCustom && !bIsCustom) return -1;
    if (!aIsCustom && bIsCustom) return 1;
    
    // Among standard rules, check draw before win (more specific condition)
    if (a.id === 'draw-rule' && b.id === 'win-rule') return -1;
    if (a.id === 'win-rule' && b.id === 'draw-rule') return 1;
    
    return 0;
  });
  
  console.log('🔢 Rule checking order:', rules.map(r => `${r.id}: ${JSON.stringify(r.condition)}`));
  
  for (const rule of rules) {
    const condition = rule.condition;
    let matches = false;
    let valueToCheck = scoreDifferential; // default

    // Determine what value to check based on condition type
    switch (condition.type) {
      case 'winner_score':
        valueToCheck = winnerScore;
        break;
      case 'loser_score':
        valueToCheck = loserScore;
        break;
      case 'score_differential':
      default:
        valueToCheck = scoreDifferential;
        break;
    }

    console.log('🔍 Checking rule:', rule.id, 'condition:', condition, 'valueToCheck:', valueToCheck);

    switch (condition.operator) {
      case 'equals':
        matches = valueToCheck === condition.value;
        break;
      case 'less_than':
        matches = valueToCheck < condition.value;
        break;
      case 'greater_than':
        matches = valueToCheck > condition.value;
        break;
      case 'less_than_or_equal':
        matches = valueToCheck <= condition.value;
        break;
      case 'greater_than_or_equal':
        matches = valueToCheck >= condition.value;
        break;
    }

    console.log('✨ Rule match result:', matches, 'Points:', isWinner ? rule.winnerPoints : rule.loserPoints);

    if (matches) {
      const points = isWinner ? rule.winnerPoints : rule.loserPoints;
      // Log special rule applications for highlighting
      if (!['win-rule', 'draw-rule'].includes(rule.id)) {
        console.log('🌟 SPECIAL RULE APPLIED:', rule.id, 'Winner score:', winnerScore, 'Points awarded:', points);
      }
      return points;
    }
  }

  // If no rule matches, use default
  return isWinner ? (formula.formula.defaultWinnerPoints || 1) : (formula.formula.defaultLoserPoints || 0);
}