import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Trophy, Target, Calendar, Users, BarChart3, Award, Zap, Edit, Plus } from "lucide-react";
import { Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export default function PlayerAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [newTarget, setNewTarget] = useState({ metric: '', value: '', description: '' });

  // Fetch player's personal analytics
  const { data: playerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/analytics/player'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch player's performance trends
  const { data: performanceTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/analytics/player/trends'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch player's tournament rankings
  const { data: tournamentRankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['/api/analytics/player/rankings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch player's custom targets
  const { data: customTargets } = useQuery({
    queryKey: ['/api/analytics/player/targets'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Create custom target mutation
  const createTargetMutation = useMutation({
    mutationFn: async (target: { metric: string; value: string; description: string }) => {
      const res = await apiRequest("POST", "/api/analytics/player/targets", target);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/player/targets'] });
      setIsTargetDialogOpen(false);
      setNewTarget({ metric: '', value: '', description: '' });
      toast({
        title: "Target Created",
        description: "Your custom target has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (statsLoading || trendsLoading || rankingsLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading your analytics...</p>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Player Analytics
          </h1>
          <p className="text-slate-600 text-lg">
            Track your performance, analyze trends, and improve your game
          </p>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Win Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {playerStats?.winRate?.toFixed(1) || '0.0'}%
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Target: 70%</span>
                  <span>{Math.round(((playerStats?.winRate || 0) / 70) * 100)}% achieved</span>
                </div>
                <Progress value={Math.min(100, ((playerStats?.winRate || 0) / 70) * 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Monthly Activity</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.floor((playerStats?.totalGames || 0) * 0.3) || 0}
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Target: 15 games/month</span>
                  <span>{Math.round((Math.floor((playerStats?.totalGames || 0) * 0.3) / 15) * 100)}% achieved</span>
                </div>
                <Progress value={Math.min(100, (Math.floor((playerStats?.totalGames || 0) * 0.3) / 15) * 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Best Streak</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {playerStats?.bestWinStreak || 0}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-3 text-sm text-slate-500">
                Current: {playerStats?.currentStreak || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Games Played</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {playerStats?.totalGames || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-amber-600" />
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Progress to 100 games</span>
                  <span>{Math.min(100, Math.round(((playerStats?.totalGames || 0) / 100) * 100))}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    style={{ width: `${Math.min(100, ((playerStats?.totalGames || 0) / 100) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Performance */}
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                    Recent Performance
                  </CardTitle>
                  <CardDescription>Your last 10 games</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {playerStats?.recentGames?.length > 0 ? (
                      playerStats.recentGames.slice(0, 10).map((game: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={game.outcome === 'win' ? 'default' : game.outcome === 'loss' ? 'destructive' : 'secondary'}
                              className="w-12 text-center"
                            >
                              {game.outcome}
                            </Badge>
                            <div>
                              <p className="font-medium text-slate-800">{game.tournamentName}</p>
                              <p className="text-sm text-slate-600">vs {game.opponent}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{game.playerScore} - {game.opponentScore}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(game.gameDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No games recorded yet. Start playing to see your performance!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Head-to-Head Records */}
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-green-600" />
                    Head-to-Head Records
                  </CardTitle>
                  <CardDescription>Your performance against specific opponents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {playerStats?.headToHeadRecords?.length > 0 ? (
                      playerStats.headToHeadRecords.slice(0, 8).map((record: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-800">{record.opponentName}</p>
                            <p className="text-sm text-slate-600">{record.totalGames} games played</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">
                              {record.wins}-{record.losses}
                            </p>
                            <p className="text-sm text-slate-600">
                              {record.winRate}% win rate
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No head-to-head records available yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Performance */}
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-purple-600" />
                    Monthly Performance
                  </CardTitle>
                  <CardDescription>Your performance over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceTrends?.monthlyStats?.length > 0 ? (
                      performanceTrends.monthlyStats.map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-800">{month.month}</p>
                            <p className="text-sm text-slate-600">{month.totalGames} games</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{month.winRate}%</p>
                            <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                              <div 
                                className="h-2 bg-purple-500 rounded-full"
                                style={{ width: `${month.winRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No monthly performance data available.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance by Game Type */}
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="mr-2 h-5 w-5 text-orange-600" />
                    Performance by Game Type
                  </CardTitle>
                  <CardDescription>How you perform in different game types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {playerStats?.performanceByGameType?.length > 0 ? (
                      playerStats.performanceByGameType.map((gameType: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-800">{gameType.gameType}</p>
                            <p className="text-sm text-slate-600">{gameType.totalGames} games</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{gameType.winRate}%</p>
                            <p className="text-sm text-slate-600">
                              {gameType.wins}W-{gameType.losses}L
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No game type performance data available.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5 text-yellow-600" />
                  Tournament Rankings
                </CardTitle>
                <CardDescription>Your current standings in active tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tournamentRankings?.length > 0 ? (
                    tournamentRankings.map((ranking: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-yellow-400">
                        <div className="flex items-center space-x-4">
                          <div className="bg-yellow-100 text-yellow-800 font-bold text-lg px-3 py-2 rounded-full">
                            #{ranking.position}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{ranking.tournamentName}</p>
                            <p className="text-sm text-slate-600">{ranking.gameType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">{ranking.points} pts</p>
                          <p className="text-sm text-slate-600">
                            {ranking.wins}W-{ranking.losses}L
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No tournament rankings available. Join a tournament to start competing!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Improvement Areas */}
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                    Areas for Improvement
                  </CardTitle>
                  <CardDescription>Insights to help you improve your game</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceTrends?.improvementAreas?.length > 0 ? (
                      performanceTrends.improvementAreas.map((area: any, index: number) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="font-medium text-blue-800">{area.area}</p>
                          <p className="text-sm text-blue-600 mt-1">{area.suggestion}</p>
                          {area.statistic && (
                            <p className="text-xs text-blue-500 mt-2">{area.statistic}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        Keep playing to get personalized improvement suggestions!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths */}
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5 text-green-600" />
                    Your Strengths
                  </CardTitle>
                  <CardDescription>What you're doing well</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceTrends?.strengths?.length > 0 ? (
                      performanceTrends.strengths.map((strength: any, index: number) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <p className="font-medium text-green-800">{strength.area}</p>
                          <p className="text-sm text-green-600 mt-1">{strength.description}</p>
                          {strength.statistic && (
                            <p className="text-xs text-green-500 mt-2">{strength.statistic}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        Play more games to discover your strengths!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="targets" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Personal Targets</h3>
              <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Target
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Target</DialogTitle>
                    <DialogDescription>
                      Set a personal goal to track your progress
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="metric">Metric</Label>
                      <Input
                        id="metric"
                        placeholder="e.g., Win Rate, Games Per Week"
                        value={newTarget.metric}
                        onChange={(e) => setNewTarget({ ...newTarget, metric: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="value">Target Value</Label>
                      <Input
                        id="value"
                        placeholder="e.g., 75, 10"
                        value={newTarget.value}
                        onChange={(e) => setNewTarget({ ...newTarget, value: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="Optional description"
                        value={newTarget.description}
                        onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
                      />
                    </div>
                    <Button 
                      onClick={() => createTargetMutation.mutate(newTarget)}
                      disabled={!newTarget.metric || !newTarget.value || createTargetMutation.isPending}
                      className="w-full"
                    >
                      {createTargetMutation.isPending ? "Creating..." : "Create Target"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTargets?.length > 0 ? (
                customTargets.map((target: any) => (
                  <Card key={target.id} className="bg-white/80 backdrop-blur-sm border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {target.metric}
                        <Target className="h-5 w-5 text-blue-600" />
                      </CardTitle>
                      {target.description && (
                        <CardDescription>{target.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {target.currentValue || 0} / {target.targetValue}
                      </div>
                      <Progress 
                        value={Math.min(((target.currentValue || 0) / target.targetValue) * 100, 100)} 
                        className="mb-2"
                      />
                      <div className="text-sm text-slate-600">
                        {Math.round(((target.currentValue || 0) / target.targetValue) * 100)}% achieved
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">No custom targets set yet</p>
                  <p className="text-sm text-slate-400">Create your first target to track your progress</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}