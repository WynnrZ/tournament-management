import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target, 
  Lightbulb, 
  Users, 
  Trophy, 
  Medal, 
  CheckCircle, 
  AlertCircle,
  Crown,
  Star,
  Award,
  Calendar,
  BarChart3,
  Zap
} from "lucide-react";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";

export default function EnhancedPlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();

  if (!playerId) {
    return <div>Player ID is required</div>;
  }

  // Get player data
  const { data: players, isLoading: playerLoading } = useQuery({
    queryKey: ["/api/players"],
  });

  // Find the specific player
  const player = players?.find((p: any) => p.id === playerId);

  // Get all players for predictions
  const { data: allPlayers } = useQuery({
    queryKey: ["/api/players"],
  });

  // Get player's specific tournaments with unique cache key
  const { data: playerTournaments } = useQuery({
    queryKey: [`/api/players/${playerId}/tournaments`],
    enabled: !!playerId,
  });

  // Get performance insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/insights"],
    enabled: !!playerId,
  });

  // Get AI predictions
  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/predictions"],
    enabled: !!playerId,
  });

  // Get trends analysis
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/trends"],
    enabled: !!playerId,
  });

  // Get milestones
  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/milestones"],
    enabled: !!playerId,
  });

  // Get recommendations
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/recommendations"],
    enabled: !!playerId,
  });

  // Get achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/social/players", playerId, "achievements"],
    enabled: !!playerId,
  });

  // Get rivalries
  const { data: rivalries, isLoading: rivalriesLoading } = useQuery({
    queryKey: ["/api/social/players", playerId, "rivalries"],
    enabled: !!playerId,
  });

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderLoadingCard = (title: string) => (
    <Card>
      <CardHeader>
        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse bg-gray-200 h-8 w-full rounded mb-2"></div>
        <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded"></div>
      </CardContent>
    </Card>
  );

  if (playerLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="md:pl-64 flex flex-col flex-1">
          <MobileNav />
          <main className="p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading player profile...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="md:pl-64 flex flex-col flex-1">
          <MobileNav />
          <main className="p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Player Not Found</h1>
              <p className="text-gray-600">The requested player could not be found.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <MobileNav />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {player?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{player?.name || 'Unknown Player'}</h1>
                  <p className="text-gray-600">Advanced Analytics & Performance Insights</p>
                </div>
              </div>
              
              {/* Tournament badges - only show tournaments this player participates in */}
              <div className="flex flex-wrap gap-2">
                {playerTournaments && Array.isArray(playerTournaments) && playerTournaments.length > 0 ? playerTournaments.map((tournament: any, index: number) => (
                  <Badge key={`tournament-${tournament.id}-${index}`} variant="secondary">
                    {tournament.name}
                  </Badge>
                )) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    No tournaments joined
                  </Badge>
                )}
              </div>
            </div>

            <Tabs defaultValue="insights" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                <TabsTrigger value="insights" className="text-xs md:text-sm">Insights</TabsTrigger>
                <TabsTrigger value="predictions" className="text-xs md:text-sm">Predictions</TabsTrigger>
                <TabsTrigger value="trends" className="text-xs md:text-sm">Trends</TabsTrigger>
                <TabsTrigger value="milestones" className="text-xs md:text-sm">Milestones</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs md:text-sm">Tips</TabsTrigger>
                <TabsTrigger value="profile" className="text-xs md:text-sm">Profile</TabsTrigger>
              </TabsList>

              {/* Performance Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Brain className="h-6 w-6" />
                    Performance Insights
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    AI-powered analysis of your playing patterns and performance factors.
                  </p>
                </div>

                {insightsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => renderLoadingCard(`Loading ${i}`))}
                  </div>
                ) : insights ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weekend Performance */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">Weekend Performance</CardTitle>
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {insights?.weekendPerformance?.winRate || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Win rate on weekends vs {insights?.weekdayPerformance?.winRate || 0}% on weekdays
                        </p>
                      </CardContent>
                    </Card>

                    {/* Time of Day Performance */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">Peak Performance Time</CardTitle>
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {insights?.bestTimeOfDay || 'Not available'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your highest win rate period
                        </p>
                      </CardContent>
                    </Card>

                    {/* Monthly Improvement */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">Monthly Improvement</CardTitle>
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {insights?.monthlyImprovement ? `+${insights.monthlyImprovement}%` : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Performance change this month
                        </p>
                      </CardContent>
                    </Card>

                    {/* Playing Style Insights */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">Playing Style Insights</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {insights?.opponentTypePerformance?.insights && Array.isArray(insights.opponentTypePerformance.insights) ? 
                            insights.opponentTypePerformance.insights.map((insight: string, index: number) => (
                              <div key={index} className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm">{insight}</p>
                              </div>
                            )) : (
                              <p className="text-sm text-muted-foreground">
                                Playing style insights will be available after analyzing more games.
                              </p>
                            )
                          }
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
                    <p className="text-gray-600">Play more games to generate performance insights.</p>
                  </div>
                )}
              </TabsContent>

              {/* AI Predictions Tab */}
              <TabsContent value="predictions" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    AI Match Predictions
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    See predicted outcomes against different opponents based on historical performance.
                  </p>
                </div>

                {predictionsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => renderLoadingCard(`Prediction ${i}`))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {allPlayers && Array.isArray(allPlayers) ? 
                      allPlayers.filter((p: any) => p.id !== playerId).map((opponent: any) => {
                        const prediction = predictions?.find((p: any) => p.opponentId === opponent.id);
                        if (!prediction) return null;

                        return (
                          <Card key={opponent.id}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>vs {opponent.name}</span>
                                <Badge 
                                  variant={prediction.winProbability > 60 ? "default" : 
                                          prediction.winProbability > 40 ? "secondary" : "destructive"}
                                >
                                  {prediction.winProbability}% win chance
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Confidence: {prediction.confidence}% | Strategy: {prediction.strategy}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">Key Factors:</div>
                                {prediction.factors && Array.isArray(prediction.factors) ? 
                                  prediction.factors.map((factor: string, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span className="text-sm">{factor}</span>
                                    </div>
                                  )) : (
                                    <p className="text-sm text-muted-foreground">
                                      Factors analysis will be available after more games.
                                    </p>
                                  )
                                }
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }) : (
                        <div className="text-center py-12">
                          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Predictions Available</h3>
                          <p className="text-gray-600">Add more players to generate match predictions.</p>
                        </div>
                      )
                    }
                  </div>
                )}
              </TabsContent>

              {/* Trend Analysis Tab */}
              <TabsContent value="trends" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    Trend Analysis
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Track your performance trends and identify areas of improvement over time.
                  </p>
                </div>

                {trendsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => renderLoadingCard(`Trend ${i}`))}
                  </div>
                ) : trends ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Skill Development</CardTitle>
                        {trends?.skillTrend?.direction ? getTrendIcon(trends.skillTrend.direction) : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {trends?.skillTrend?.direction === 'improving' ? '+' : trends?.skillTrend?.direction === 'declining' ? '-' : ''}
                          {trends?.skillTrend?.percentage || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {trends?.skillTrend?.direction || 'STABLE'} TREND
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Activity Level</CardTitle>
                        {trends?.gameVolumeTrend?.direction ? getTrendIcon(trends.gameVolumeTrend.direction) : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {trends?.gameVolumeTrend?.direction === 'increasing' ? '+' : trends?.gameVolumeTrend?.direction === 'decreasing' ? '-' : ''}
                          {trends?.gameVolumeTrend?.change || 0}
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          GAMES {trends?.gameVolumeTrend?.direction || 'STABLE'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          Improving Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {trends?.strengthsImproving && Array.isArray(trends.strengthsImproving) ? trends.strengthsImproving.map((strength: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{strength}</span>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">
                              Strength analysis will be available after analyzing more games.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-blue-500" />
                          Areas for Improvement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {trends?.areasForImprovement && Array.isArray(trends.areasForImprovement) ? trends.areasForImprovement.map((area: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{area}</span>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">
                              Improvement analysis will be available after analyzing more games.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Trends Available</h3>
                    <p className="text-gray-600">Play more games to generate trend analysis.</p>
                  </div>
                )}
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="h-6 w-6" />
                    Milestones & Achievements
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Track your progress toward gaming milestones and celebrate your achievements.
                  </p>
                </div>

                {milestonesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3].map((i) => renderLoadingCard(`Milestone ${i}`))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {milestones?.recentlyAchieved && Array.isArray(milestones.recentlyAchieved) && milestones.recentlyAchieved.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Medal className="h-5 w-5 text-yellow-500" />
                            Recent Achievements
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {milestones.recentlyAchieved.map((achievement: any, index: number) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <Medal className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="font-medium text-green-800">{achievement.description}</p>
                                  <p className="text-sm text-green-600">
                                    {new Date(achievement.achievedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>Active Milestones</CardTitle>
                        <CardDescription>Your progress toward upcoming achievements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {milestones?.activeMilestones && Array.isArray(milestones.activeMilestones) ? milestones.activeMilestones.map((milestone: any, index: number) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{milestone.description}</span>
                                <span className="text-sm text-muted-foreground">
                                  {milestone.currentValue}/{milestone.targetValue}
                                </span>
                              </div>
                              <Progress 
                                value={(milestone.currentValue / milestone.targetValue) * 100} 
                                className="w-full" 
                              />
                            </div>
                          )) : (
                            <p className="text-center text-muted-foreground py-8">
                              No active milestones. Keep playing to unlock new achievements!
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Lightbulb className="h-6 w-6" />
                    Personalized Recommendations
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Get AI-powered suggestions to improve your gameplay and find ideal opponents.
                  </p>
                </div>

                {recommendationsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => renderLoadingCard(`Recommendation ${i}`))}
                  </div>
                ) : recommendations ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Similar Skill Players</CardTitle>
                        <CardDescription>Players at your skill level for balanced matches</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations?.similarSkillPlayers && Array.isArray(recommendations.similarSkillPlayers) ? recommendations.similarSkillPlayers.map((player: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <span className="font-medium">{player.name}</span>
                              <Badge variant="outline">{player.winRate}% WR</Badge>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">
                              Similar skill recommendations will be available after more games.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Learning Opportunities</CardTitle>
                        <CardDescription>Challenge stronger players to improve</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations?.learningOpportunities && Array.isArray(recommendations.learningOpportunities) ? recommendations.learningOpportunities.map((player: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                              <span className="font-medium">{player.name}</span>
                              <Badge variant="outline">{player.winRate}% WR</Badge>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">
                              Learning opportunities will be available after more games.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Good Match-ups</CardTitle>
                        <CardDescription>Players you have good chances against</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations?.goodMatches && Array.isArray(recommendations.goodMatches) ? recommendations.goodMatches.map((player: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <span className="font-medium">{player.name}</span>
                              <Badge variant="outline">{player.winRate}% WR</Badge>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">
                              Match-up recommendations will be available after more games.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
                    <p className="text-gray-600">Play more games to generate personalized recommendations.</p>
                  </div>
                )}
              </TabsContent>

              {/* Detailed Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Star className="h-6 w-6" />
                    Detailed Profile & Social Stats
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Comprehensive overview of your gaming profile, achievements, and social connections.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Games Played</p>
                          <p className="text-2xl font-bold">{player?.gamesPlayed || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Wins</p>
                          <p className="text-2xl font-bold">{player?.wins || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Losses</p>
                          <p className="text-2xl font-bold">{player?.losses || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Win Rate</p>
                          <p className="text-2xl font-bold">
                            {player?.winRate ? `${player.winRate}%` : '0%'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Average Score</p>
                          <p className="text-2xl font-bold">
                            {player?.averageScore || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Achievements */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Achievements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {achievements && Array.isArray(achievements) && achievements.length > 0 ? 
                          achievements.slice(0, 5).map((achievement: any, index: number) => (
                            <div key={index} className="flex items-center gap-3">
                              <Trophy className="h-5 w-5 text-yellow-500" />
                              <div>
                                <p className="font-medium">{achievement.title}</p>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              </div>
                            </div>
                          )) : (
                            <p className="text-center text-muted-foreground py-4">
                              No achievements yet. Keep playing to unlock rewards!
                            </p>
                          )
                        }
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rivalries */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Player Rivalries</CardTitle>
                      <CardDescription>Your most frequent opponents and match history</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {rivalries && Array.isArray(rivalries) && rivalries.length > 0 ? 
                          rivalries.map((rivalry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                  {rivalry.opponentName?.charAt(0) || 'R'}
                                </div>
                                <div>
                                  <p className="font-medium">{rivalry.opponentName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {rivalry.totalGames} games played
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {rivalry.wins}-{rivalry.losses}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {((rivalry.wins / rivalry.totalGames) * 100).toFixed(1)}% win rate
                                </p>
                              </div>
                            </div>
                          )) : (
                            <p className="text-center text-muted-foreground py-8">
                              No rivalries yet. Play against the same opponents multiple times to develop rivalries!
                            </p>
                          )
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}