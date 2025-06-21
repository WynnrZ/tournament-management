import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { useParams } from "wouter";
import { 
  Trophy, 
  Target, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Users,
  Zap,
  Brain,
  Award,
  Star,
  Flame,
  Shield,
  GamepadIcon,
  Eye,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  Lightbulb,
  Medal,
  Crown,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react";

export default function EnhancedPlayerProfilePage() {
  const { playerId } = useParams();
  const { user } = useAuth();
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");

  // Get player data
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["/api/players", playerId],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  // Get tournaments for filtering
  const { data: tournaments } = useQuery({
    queryKey: ["/api/tournaments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Get all players for opponent selection
  const { data: allPlayers } = useQuery({
    queryKey: ["/api/players"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Get performance insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/insights"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  // Get trend analysis
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/trends"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  // Get milestones
  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/milestones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  // Get player recommendations
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/recommendations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  // Get match prediction when opponent is selected
  const { data: prediction, isLoading: predictionLoading } = useQuery({
    queryKey: ["/api/players", playerId, "analytics/predictions", selectedOpponent],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId && !!selectedOpponent,
  });

  // Get player achievements
  const { data: achievements } = useQuery({
    queryKey: ["/api/social/players", playerId, "achievements"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  // Get player stats and rivalries
  const { data: playerStats } = useQuery({
    queryKey: ["/api/social/players", playerId, "stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  const { data: rivalries } = useQuery({
    queryKey: ["/api/social/players", playerId, "rivalries"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!playerId,
  });

  if (playerLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto ml-0 lg:ml-64">
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
        <div className="flex-1 overflow-auto ml-0 lg:ml-64">
          <MobileNav />
          <main className="p-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Not Found</h2>
              <p className="text-gray-600">The requested player profile could not be found.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 bg-green-50";
    if (confidence >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto ml-0 lg:ml-64">
        <MobileNav />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Player Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{player.name}</h1>
                    <p className="text-muted-foreground">
                      {player.email && `${player.email} • `}
                      Member since {new Date(player.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        <Trophy className="h-3 w-3 mr-1" />
                        {playerStats?.wins || 0} Wins
                      </Badge>
                      <Badge variant="outline">
                        <Target className="h-3 w-3 mr-1" />
                        {playerStats?.gamesPlayed || 0} Games
                      </Badge>
                      {playerStats?.winRate && (
                        <Badge variant="outline">
                          {Math.round(playerStats.winRate * 100)}% Win Rate
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Tournament" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tournaments</SelectItem>
                        {tournaments?.map((tournament: any) => (
                          <SelectItem key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="insights" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="insights">Performance Insights</TabsTrigger>
                <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
                <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="profile">Detailed Profile</TabsTrigger>
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
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="animate-pulse bg-gray-200 h-8 w-full rounded mb-2"></div>
                          <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
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
                        <div className="flex items-center gap-2 mb-2">
                          {insights?.weekendPerformance?.improvement && insights.weekendPerformance.improvement > 0 ? (
                            <ArrowUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-2xl font-bold">
                            {Math.abs(insights?.weekendPerformance?.improvement || 0)}%
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insights?.weekendPerformance?.description || "Performance data will be available after playing more games."}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Best Time Performance */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">Best Playing Time</CardTitle>
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUp className="h-4 w-4 text-green-500" />
                          <span className="text-2xl font-bold capitalize">
                            {insights?.timeOfDayPerformance?.bestTime || "Analyzing..."}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insights?.timeOfDayPerformance?.description || "Time-based performance data will be available after playing more games."}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Monthly Improvement */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">Monthly Progress</CardTitle>
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          {insights?.monthlyImprovement?.percentage && insights.monthlyImprovement.percentage > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-2xl font-bold">
                            {Math.abs(insights?.monthlyImprovement?.percentage || 0)}%
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insights?.monthlyImprovement?.description || "Monthly progress data will be available after playing more games."}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Opponent Analysis */}
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
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Play more games to unlock performance insights</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AI Predictions Tab */}
              <TabsContent value="predictions" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Zap className="h-6 w-6" />
                    AI Match Predictions
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Get AI-powered predictions for match outcomes based on historical data.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Select Opponent for Prediction</CardTitle>
                    <CardDescription>
                      Choose an opponent to see AI-generated match outcome predictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an opponent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allPlayers?.filter((p: any) => p.id !== playerId).map((opponent: any) => (
                          <SelectItem key={opponent.id} value={opponent.id}>
                            {opponent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedOpponent && (
                  predictionLoading ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p>Generating AI prediction...</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : prediction ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Win Probability
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <div className="text-4xl font-bold mb-2">
                              {prediction.winProbability}%
                            </div>
                            <Progress value={prediction.winProbability} className="h-3 mb-4" />
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              {prediction.confidence}% Confidence
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5" />
                            Recommended Strategy
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed">
                            {prediction.recommendedStrategy}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle>Prediction Factors</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {prediction.factors.map((factor: string, index: number) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p className="text-sm">{factor}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Insufficient data for prediction</p>
                          <p className="text-sm">Play more games against this opponent to enable predictions</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
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
                    Track your improvement over time and identify areas of growth.
                  </p>
                </div>

                {trendsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i}>
                        <CardContent className="py-6">
                          <div className="animate-pulse bg-gray-200 h-20 w-full rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
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
                          <ArrowUp className="h-4 w-4 text-green-500" />
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
                          <Target className="h-4 w-4 text-blue-500" />
                          Focus Areas
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
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Play more games to see trend analysis</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Award className="h-6 w-6" />
                    Milestone Tracking
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Visual progress toward personal bests and achievement targets.
                  </p>
                </div>

                {milestonesLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="py-6">
                          <div className="animate-pulse bg-gray-200 h-16 w-full rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : milestones ? (
                  <div className="space-y-6">
                    {milestones.recentlyAchieved.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Recently Achieved
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {milestones?.recentlyAchieved && Array.isArray(milestones.recentlyAchieved) ? milestones.recentlyAchieved.map((achievement: any, index: number) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <Medal className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="font-medium text-green-800">{achievement.description}</p>
                                  <p className="text-xs text-green-600">
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
                          {milestones.activeMilestones.map((milestone: any, index: number) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{milestone.description}</span>
                                <span className="text-sm text-muted-foreground">
                                  {milestone.current} / {milestone.target}
                                </span>
                              </div>
                              <Progress value={milestone.progress} className="h-2" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{milestone.progress}% Complete</span>
                                <span>{milestone.target - milestone.current} remaining</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Start playing to unlock milestone tracking</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Player Recommendations
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Discover players similar to your skill level and find good opponents.
                  </p>
                </div>

                {recommendationsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="py-6">
                          <div className="animate-pulse bg-gray-200 h-24 w-full rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : recommendations ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-blue-500" />
                          Similar Skill Level
                        </CardTitle>
                        <CardDescription>Players with comparable abilities</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.similarSkillPlayers.map((player: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{player.name}</span>
                                <Badge variant="outline">{player.matchScore}% match</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{player.reason}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          Learning Opportunities
                        </CardTitle>
                        <CardDescription>Slightly stronger players to learn from</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.learningOpportunities.map((player: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{player.name}</span>
                                <Badge variant="outline">+{player.skillGap}% skill</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{player.reason}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Flame className="h-5 w-5 text-orange-500" />
                          Good Matches
                        </CardTitle>
                        <CardDescription>Competitive and exciting opponents</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.goodMatches.map((player: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{player.name}</span>
                                <Badge variant="outline">{player.competitiveness}% competitive</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{player.reason}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Play more games to get player recommendations</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Detailed Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <User className="h-6 w-6" />
                    Detailed Player Profile
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Complete overview of player statistics, achievements, and activity.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Player Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Game Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {playerStats ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{playerStats.gamesPlayed}</div>
                              <div className="text-sm text-blue-800">Games Played</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">{playerStats.wins}</div>
                              <div className="text-sm text-green-800">Wins</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <div className="text-2xl font-bold text-red-600">{playerStats.losses}</div>
                              <div className="text-sm text-red-800">Losses</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                              <div className="text-2xl font-bold text-yellow-600">
                                {Math.round((playerStats.winRate || 0) * 100)}%
                              </div>
                              <div className="text-sm text-yellow-800">Win Rate</div>
                            </div>
                          </div>
                          {playerStats.averageScore && (
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">
                                {playerStats.averageScore.toFixed(1)}
                              </div>
                              <div className="text-sm text-purple-800">Average Score</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No statistics available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Achievements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {achievements && achievements.length > 0 ? (
                        <div className="space-y-3">
                          {achievements.slice(0, 5).map((achievement: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-2 border rounded">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <div>
                                <div className="font-medium text-sm">{achievement.achievement.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No achievements yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Favorite Opponents/Rivalries */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Player Rivalries</CardTitle>
                      <CardDescription>Your most frequent opponents and competitive matchups</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {rivalries && rivalries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rivalries.map((rivalry: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{rivalry.opponentName}</span>
                                <Badge variant="outline">
                                  {rivalry.wins}-{rivalry.losses}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {rivalry.totalGames} games played • Last played {new Date(rivalry.lastGame).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No rivalries established yet</p>
                      )}
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