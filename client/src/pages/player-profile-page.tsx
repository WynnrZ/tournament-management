import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Users, 
  GamepadIcon, 
  Star, 
  Crown,
  Shield,
  Flame,
  Medal,
  UserPlus,
  UserMinus,
  Calendar,
  BarChart3,
  Zap
} from "lucide-react";

interface PlayerStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  currentWinStreak: number;
  longestWinStreak: number;
  tournamentsParticipated: number;
  perfectGames: number;
  averageScore: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirements: any;
  points: number;
  rarity: string;
  isActive: boolean;
}

interface PlayerAchievement {
  id: string;
  playerId: string;
  achievementId: string;
  unlockedAt: Date;
  tournamentId: string | null;
  progress: number;
  isCompleted: boolean;
  achievement: Achievement;
}

interface Rivalry {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  lastGameAt: Date;
}

interface PerformanceInsights {
  performanceByDayOfWeek: Array<{
    day: string;
    winRate: number;
    gamesPlayed: number;
  }>;
  recentTrends: Array<{
    period: string;
    winRate: number;
    gamesPlayed: number;
  }>;
  strengthsWeaknesses: Array<any>;
}

export default function PlayerProfilePage() {
  const { playerId } = useParams();
  const { toast } = useToast();
  const [selectedTournament, setSelectedTournament] = useState<string | undefined>();

  // Get player information
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["/api/players", playerId],
    queryFn: getQueryFn(),
  });

  // Get player statistics
  const { data: stats, isLoading: statsLoading } = useQuery<PlayerStats>({
    queryKey: ["/api/social/players", playerId, "stats"],
    queryFn: getQueryFn(),
    enabled: !!playerId,
  });

  // Get player achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery<PlayerAchievement[]>({
    queryKey: ["/api/social/players", playerId, "achievements"],
    queryFn: getQueryFn(),
    enabled: !!playerId,
  });

  // Get player rivalries
  const { data: rivalries, isLoading: rivalriesLoading } = useQuery<Rivalry[]>({
    queryKey: ["/api/social/players", playerId, "rivalries"],
    queryFn: getQueryFn(),
    enabled: !!playerId,
  });

  // Get performance insights
  const { data: insights, isLoading: insightsLoading } = useQuery<PerformanceInsights>({
    queryKey: ["/api/social/players", playerId, "insights"],
    queryFn: getQueryFn(),
    enabled: !!playerId,
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/social/players/${playerId}/follow`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Player followed successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/social/players", playerId, "followers"]
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/social/players/${playerId}/follow`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Player unfollowed successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/social/players", playerId, "followers"]
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check achievements mutation
  const checkAchievementsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/social/players/${playerId}/achievements/check`, {
        tournamentId: selectedTournament
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.achievements.length > 0) {
        toast({
          title: "New Achievements Unlocked!",
          description: `You've unlocked ${data.achievements.length} new achievement(s)`,
        });
      } else {
        toast({
          title: "No New Achievements",
          description: "Keep playing to unlock more achievements!",
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["/api/social/players", playerId, "achievements"]
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return <Trophy className="h-6 w-6" />;
      case 'flame': return <Flame className="h-6 w-6" />;
      case 'gamepad-2': return <GamepadIcon className="h-6 w-6" />;
      case 'star': return <Star className="h-6 w-6" />;
      case 'crown': return <Crown className="h-6 w-6" />;
      case 'shield': return <Shield className="h-6 w-6" />;
      default: return <Medal className="h-6 w-6" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (playerLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading player profile...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Player Not Found</CardTitle>
            <CardDescription>The requested player could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Player Header */}
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarImage src={player.image} />
          <AvatarFallback className="text-2xl">
            {player.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="text-muted-foreground">Player Profile</p>
          
          {stats && (
            <div className="flex gap-4 mt-2">
              <Badge variant="secondary">
                <Trophy className="h-4 w-4 mr-1" />
                {stats.totalWins} Wins
              </Badge>
              <Badge variant="secondary">
                <GamepadIcon className="h-4 w-4 mr-1" />
                {stats.totalGames} Games
              </Badge>
              <Badge variant="secondary">
                <Target className="h-4 w-4 mr-1" />
                {((stats.totalWins / Math.max(stats.totalGames, 1)) * 100).toFixed(1)}% Win Rate
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.href = `/players/${playerId}/analytics`}
            variant="default"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Player Analytics
          </Button>
          <Button 
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            variant="outline"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Follow
          </Button>
          <Button 
            onClick={() => checkAchievementsMutation.mutate()}
            disabled={checkAchievementsMutation.isPending}
            variant="outline"
          >
            <Zap className="h-4 w-4 mr-2" />
            Check Achievements
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="rivalries">Rivalries</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                    <GamepadIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalGames}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((stats.totalWins / Math.max(stats.totalGames, 1)) * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.currentWinStreak}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Perfect Games</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.perfectGames}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <p>Loading achievements...</p>
              ) : achievements && achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.slice(0, 6).map((playerAchievement) => (
                    <div key={playerAchievement.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getAchievementIcon(playerAchievement.achievement.icon)}
                      <div className="flex-1">
                        <h4 className="font-medium">{playerAchievement.achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {playerAchievement.achievement.description}
                        </p>
                        <Badge className={`mt-1 ${getRarityColor(playerAchievement.achievement.rarity)}`}>
                          {playerAchievement.achievement.rarity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No achievements unlocked yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Collection</CardTitle>
              <CardDescription>
                Track your progress and unlock new achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <p>Loading achievements...</p>
              ) : achievements && achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {achievements.map((playerAchievement) => (
                    <div key={playerAchievement.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getAchievementIcon(playerAchievement.achievement.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{playerAchievement.achievement.name}</h3>
                            <Badge className={getRarityColor(playerAchievement.achievement.rarity)}>
                              {playerAchievement.achievement.rarity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {playerAchievement.achievement.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {playerAchievement.achievement.points} points
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Unlocked {new Date(playerAchievement.unlockedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {playerAchievement.progress < 100 && (
                            <Progress value={playerAchievement.progress} className="mt-2" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No achievements unlocked yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rivalries Tab */}
        <TabsContent value="rivalries">
          <Card>
            <CardHeader>
              <CardTitle>Player Rivalries</CardTitle>
              <CardDescription>
                Your competitive history with other players
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rivalriesLoading ? (
                <p>Loading rivalries...</p>
              ) : rivalries && rivalries.length > 0 ? (
                <div className="space-y-4">
                  {rivalries.map((rivalry) => (
                    <div key={rivalry.opponentId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {rivalry.opponentName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{rivalry.opponentName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {rivalry.totalGames} games played
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {rivalry.wins}-{rivalry.losses}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {rivalry.winRate.toFixed(1)}% win rate
                          </div>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between text-sm">
                        <span>Last game: {new Date(rivalry.lastGameAt).toLocaleDateString()}</span>
                        <Badge variant={rivalry.winRate > 50 ? "default" : "secondary"}>
                          {rivalry.winRate > 50 ? "Winning" : "Losing"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No rivalries found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance by Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <p>Loading insights...</p>
                ) : insights?.performanceByDayOfWeek ? (
                  <div className="space-y-3">
                    {insights.performanceByDayOfWeek.map((day) => (
                      <div key={day.day} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{day.day}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={day.winRate} className="w-20" />
                          <span className="text-sm text-muted-foreground w-12">
                            {day.winRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No performance data available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <p>Loading trends...</p>
                ) : insights?.recentTrends ? (
                  <div className="space-y-3">
                    {insights.recentTrends.map((trend) => (
                      <div key={trend.period} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{trend.period}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {trend.gamesPlayed} games
                          </span>
                          <Badge variant={trend.winRate > 50 ? "default" : "secondary"}>
                            {trend.winRate.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No trend data available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest games and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Activity feed coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}