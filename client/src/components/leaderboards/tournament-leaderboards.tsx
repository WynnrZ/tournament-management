import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, User, Loader2, Database, Calculator, RefreshCw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { LeaderboardTable } from './leaderboard-table';
import { RawDataTable } from './raw-data-table';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import type { Tournament, LeaderboardFormula } from '@shared/schema';

interface TournamentLeaderboardsProps {
  tournamentId: string;
}

export function TournamentLeaderboards({ tournamentId }: TournamentLeaderboardsProps) {
  const { user } = useAuth();
  const [selectedFormulaId, setSelectedFormulaId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Fetch tournament info to get current user's admin status and default formula
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId,
  });

  // Fetch available formulas for this tournament (for all users to see formula selector)
  const isAdmin = tournament?.createdBy === user?.id || user?.isAppAdmin || user?.isAdmin;
  const { data: formulas = [] } = useQuery<LeaderboardFormula[]>({
    queryKey: [`/api/tournaments/${tournamentId}/formulas`],
    enabled: !!tournamentId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Also fetch global formulas (including templates) for admins
  const { data: globalFormulas = [] } = useQuery<LeaderboardFormula[]>({
    queryKey: ["/api/leaderboard-formulas"],
    enabled: !!isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Combine tournament-specific formulas with available global formulas for admins
  const availableFormulas = isAdmin ? [...formulas, ...globalFormulas.filter(f => f.isDefault)] : formulas;
  


  // Fetch available years for date filtering
  const { data: availableYears = [] } = useQuery<number[]>({
    queryKey: [`/api/tournaments/${tournamentId}/years`],
    enabled: !!tournamentId,
  });

  // Use selected formula or tournament's default formula or first available formula
  const effectiveFormulaId = selectedFormulaId || tournament?.defaultFormulaId || availableFormulas[0]?.id;

  // Clear cache when formula changes
  useEffect(() => {
    if (effectiveFormulaId) {
      queryClient.removeQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && 
                 queryKey.some(key => 
                   typeof key === 'string' && 
                   (key.includes(`/api/tournaments/${tournamentId}/player-leaderboard`) ||
                    key.includes(`/api/tournaments/${tournamentId}/team-leaderboard`))
                 );
        }
      });
    }
  }, [effectiveFormulaId, tournamentId, queryClient]);

  // ALWAYS pass the formula ID if we have one - this is crucial for your Dominology formula!
  // Build URL with date filtering parameters
  const buildUrl = (baseUrl: string) => {
    const params = new URLSearchParams();
    if (effectiveFormulaId) params.set('formulaId', effectiveFormulaId.toString());
    if (selectedYear !== 'all') params.set('year', selectedYear);
    if (selectedMonth !== 'all') params.set('month', selectedMonth);
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  const playerLeaderboardUrl = buildUrl(`/api/tournaments/${tournamentId}/player-leaderboard`);
  const teamLeaderboardUrl = buildUrl(`/api/tournaments/${tournamentId}/team-leaderboard`);

  console.log('🎯 Frontend using formula ID:', effectiveFormulaId, 'for URLs:', playerLeaderboardUrl);

  // Fetch player leaderboard data
  const { 
    data: playerLeaderboard,
    isLoading: isLoadingPlayerLeaderboard,
    error: playerLeaderboardError
  } = useQuery({
    queryKey: [playerLeaderboardUrl],
    enabled: !!tournamentId,
  });
  
  // Fetch team leaderboard data
  const { 
    data: teamLeaderboard,
    isLoading: isLoadingTeamLeaderboard,
    error: teamLeaderboardError
  } = useQuery({
    queryKey: [teamLeaderboardUrl],
    enabled: !!tournamentId,
  });
  
  const isLoading = isLoadingPlayerLeaderboard || isLoadingTeamLeaderboard;

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear all cache entries related to this tournament's leaderboards
      queryClient.removeQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && 
                 queryKey.some(key => 
                   typeof key === 'string' && 
                   (key.includes(`/api/tournaments/${tournamentId}/player-leaderboard`) ||
                    key.includes(`/api/tournaments/${tournamentId}/team-leaderboard`))
                 );
        }
      });
      
      // Force fresh fetch of current queries
      await Promise.all([
        queryClient.fetchQuery({ 
          queryKey: [playerLeaderboardUrl],
          staleTime: 0
        }),
        queryClient.fetchQuery({ 
          queryKey: [teamLeaderboardUrl],
          staleTime: 0
        })
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-36">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (playerLeaderboardError || teamLeaderboardError) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Leaderboards</CardTitle>
          <CardDescription className="text-red-700">
            There was a problem loading the leaderboard data. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Tabs defaultValue="player" className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">Leaderboards</h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Formula Selector - Show for all users when formulas exist */}
          {availableFormulas.length > 0 && (
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="formula-select" className="text-sm font-medium whitespace-nowrap">
                Scoring Formula:
              </Label>
              <Select
                value={selectedFormulaId?.toString() || (availableFormulas[0]?.id?.toString() || "")}
                onValueChange={(value) => {
                  const numValue = parseInt(value);
                  setSelectedFormulaId(isNaN(numValue) ? null : numValue);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select formula..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFormulas.map((formula) => (
                    <SelectItem key={formula.id} value={formula.id.toString()}>
                      {formula.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Formula explanation tooltip */}
              {availableFormulas.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <div className="space-y-2">
                        {(() => {
                          const currentFormula = availableFormulas.find(f => f.id === effectiveFormulaId);
                          if (currentFormula) {
                            const formula = typeof currentFormula.formula === 'string' 
                              ? JSON.parse(currentFormula.formula) 
                              : currentFormula.formula;
                            return (
                              <>
                                <p className="font-medium">{currentFormula.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formula.description || 'Custom scoring formula'}
                                </p>
                                <div className="text-xs space-y-1 border-t pt-2">
                                  <p className="font-medium text-muted-foreground">Rules:</p>
                                  {formula.rules && formula.rules.map((rule: any, index: number) => (
                                    <div key={rule.id || index} className="text-xs">
                                      {rule.description || 
                                        `${rule.condition?.type === 'winner_score' ? 'Winner score' : 
                                          rule.condition?.type === 'score_differential' ? 'Score difference' : 'Condition'} 
                                         ${rule.condition?.operator} ${rule.condition?.value}: 
                                         Winner +${rule.winnerPoints}, Loser +${rule.loserPoints}`}
                                    </div>
                                  ))}
                                  <div className="text-xs text-muted-foreground border-t pt-1">
                                    Default: Winner +{formula.defaultWinnerPoints || 3}, Loser +{formula.defaultLoserPoints || 0}
                                  </div>
                                </div>
                              </>
                            );
                          }
                          return <p className="text-sm">No formula selected</p>;
                        })()}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          
          {/* Date Filtering Controls */}
          <div className="flex items-center gap-2">
            <Label htmlFor="year-select" className="text-sm font-medium whitespace-nowrap">
              Year:
            </Label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="month-select" className="text-sm font-medium whitespace-nowrap">
              Month:
            </Label>
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="01">January</SelectItem>
                <SelectItem value="02">February</SelectItem>
                <SelectItem value="03">March</SelectItem>
                <SelectItem value="04">April</SelectItem>
                <SelectItem value="05">May</SelectItem>
                <SelectItem value="06">June</SelectItem>
                <SelectItem value="07">July</SelectItem>
                <SelectItem value="08">August</SelectItem>
                <SelectItem value="09">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <TabsList>
              <TabsTrigger value="player" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Team
              </TabsTrigger>

              <TabsTrigger value="data" className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Data
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>
      
      <TabsContent value="player">
        <Card>
          <CardHeader>
            <CardTitle>Individual Player Rankings</CardTitle>
            <CardDescription>
              Player scores include both individual game performance and points earned in team games.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable entries={playerLeaderboard || []} type="player" />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="team">
        <Card>
          <CardHeader>
            <CardTitle>Team Rankings</CardTitle>
            <CardDescription>
              Teams are ranked based on their overall performance in team games.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable entries={teamLeaderboard || []} type="team" />
          </CardContent>
        </Card>
      </TabsContent>
      

      
      <TabsContent value="data">
        <RawDataTable 
          tournamentId={tournamentId} 
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          availableYears={availableYears}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />
      </TabsContent>
    </Tabs>
  );
}