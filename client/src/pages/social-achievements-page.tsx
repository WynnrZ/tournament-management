import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  Trophy, 
  Target, 
  Crown,
  Shield,
  Flame,
  Medal,
  GamepadIcon,
  Star,
  Zap,
  Filter,
  Award
} from "lucide-react";

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

export default function SocialAchievementsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<string>("my-achievements");

  // Get all achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ["/api/social/achievements"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Get user achievements
  const { data: userAchievements, isLoading: userAchievementsLoading } = useQuery({
    queryKey: ["/api/social/players", user?.id, "achievements"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  // Get user's tournaments for filtering
  const { data: tournaments } = useQuery({
    queryKey: ["/api/my-tournaments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  // Get tournament players with achievements for competitive view
  const { data: tournamentPlayersAchievements } = useQuery({
    queryKey: ["/api/tournaments/players-achievements"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: viewMode === "tournament-achievements",
  });

  // Initialize achievements mutation (admin only)
  const initAchievementsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/achievements/init", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/achievements"] });
      toast({
        title: "Success",
        description: "Achievements initialized successfully",
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
      case 'trophy': return <Trophy className="h-4 w-4" />;
      case 'flame': return <Flame className="h-4 w-4" />;
      case 'gamepad-2': return <GamepadIcon className="h-4 w-4" />;
      case 'star': return <Star className="h-4 w-4" />;
      case 'crown': return <Crown className="h-4 w-4" />;
      case 'shield': return <Shield className="h-4 w-4" />;
      case 'target': return <Target className="h-4 w-4" />;
      case 'zap': return <Zap className="h-4 w-4" />;
      default: return <Medal className="h-4 w-4" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gameplay': return <GamepadIcon className="h-3 w-3" />;
      case 'social': return <Star className="h-3 w-3" />;
      case 'achievement': return <Trophy className="h-3 w-3" />;
      case 'tournament': return <Crown className="h-3 w-3" />;
      default: return <Medal className="h-4 w-4" />;
    }
  };

  // Helper function to check if user has unlocked an achievement
  const isAchievementUnlocked = (achievementId: string) => {
    return Array.isArray(userAchievements) && userAchievements.some((ua: any) => ua.achievementId === achievementId && ua.isCompleted);
  };

  // Helper function to get user achievement progress
  const getAchievementProgress = (achievementId: string) => {
    if (!Array.isArray(userAchievements)) return 0;
    const userAchievement = userAchievements.find((ua: any) => ua.achievementId === achievementId);
    return userAchievement?.progress || 0;
  };

  // Get tournament name by ID
  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId || !Array.isArray(tournaments)) return "General";
    const tournament = tournaments.find((t: any) => t.id === tournamentId);
    return tournament?.name || "Unknown Tournament";
  };

  // Get user's earned achievements only
  const userEarnedAchievements = userAchievements?.filter((ua: any) => ua.isCompleted).map((ua: any) => ua.achievement) || [];
  
  // Get user's tournament IDs for filtering
  const userTournamentIds = tournaments ? tournaments.map((t: any) => t.id) : [];

  // Filter to only show achievements the user has actually earned
  const filteredAchievements = userEarnedAchievements.filter(achievement => 
    selectedCategory === "all" || achievement.category === selectedCategory
  );

  // Separate earned achievements by type and filter tournament achievements to user's tournaments only
  const globalAchievements = filteredAchievements.filter(a => !(a as any).tournamentId);
  const tournamentAchievements = filteredAchievements.filter(a => 
    (a as any).tournamentId && userTournamentIds.includes((a as any).tournamentId)
  );

  const categories = userEarnedAchievements.length > 0 ? 
    ["all", ...Array.from(new Set(userEarnedAchievements.map(a => a.category)))] : 
    ["all"];

  const achievementsByRarity = {
    common: filteredAchievements.filter(a => a.rarity === 'common'),
    rare: filteredAchievements.filter(a => a.rarity === 'rare'),
    epic: filteredAchievements.filter(a => a.rarity === 'epic'),
    legendary: filteredAchievements.filter(a => a.rarity === 'legendary'),
  };

  if (achievementsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="md:pl-64 flex flex-col flex-1">
          <MobileNav />
          <main className="p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading achievements...</p>
              </div>
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Award className="h-8 w-8" />
                  Achievement Gallery
                </h1>
                <p className="text-muted-foreground mt-2">
                  Discover and unlock achievements through competitive play
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => initAchievementsMutation.mutate()}
                  disabled={initAchievementsMutation.isPending}
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Initialize Achievements
                </Button>
              </div>
            </div>

            {/* Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Achievements</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userEarnedAchievements.length || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Common</CardTitle>
                  <Medal className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{achievementsByRarity.common.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rare & Epic</CardTitle>
                  <Star className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {achievementsByRarity.rare.length + achievementsByRarity.epic.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Legendary</CardTitle>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{achievementsByRarity.legendary.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* View Mode Selection */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">View:</span>
              </div>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my-achievements">My Achievement Progress</SelectItem>
                  <SelectItem value="tournament-achievements">Tournament Competition</SelectItem>
                  <SelectItem value="all-achievements">All Achievements Gallery</SelectItem>
                </SelectContent>
              </Select>
              
              {viewMode !== "tournament-achievements" && (
                <>
                  <div className="flex items-center gap-2 ml-4">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Category:</span>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            {category !== "all" && getCategoryIcon(category)}
                            {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* My Achievements View */}
            {viewMode === "my-achievements" && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Your Achievement Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {user ? `Welcome back, ${user.name}! Track your progress across all achievements.` : 'Sign in to track your achievements.'}
                  </p>
                </div>
                
                {user ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAchievements.map((achievement) => {
                      const isUnlocked = isAchievementUnlocked(achievement.id);
                      const progress = getAchievementProgress(achievement.id);
                      const maxProgress = achievement.requirements?.value || 1;
                      const progressPercentage = Math.min((progress / maxProgress) * 100, 100);
                      
                      return (
                        <Card key={achievement.id} className={`relative overflow-hidden group hover:shadow-lg transition-shadow ${isUnlocked ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getRarityColor(achievement.rarity)} ${isUnlocked ? 'ring-2 ring-green-400' : ''}`}>
                                  {getAchievementIcon(achievement.icon)}
                                </div>
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {achievement.name}
                                    {isUnlocked && <Trophy className="h-4 w-4 text-green-500" />}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {getCategoryIcon(achievement.category)}
                                      <span className="ml-1 capitalize">{achievement.category}</span>
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                                      {achievement.rarity}
                                    </Badge>
                                    {(achievement as any).tournamentId && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {getTournamentName((achievement as any).tournamentId)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-muted-foreground">
                                  {achievement.points} pts
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            <CardDescription className="text-sm mb-4">
                              {achievement.description}
                            </CardDescription>
                            
                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span>{progress}/{maxProgress}</span>
                              </div>
                              <Progress value={progressPercentage} className="h-2" />
                              {isUnlocked && (
                                <p className="text-xs text-green-600 mt-1 font-medium">✓ Completed!</p>
                              )}
                            </div>
                            
                            {achievement.requirements && (
                              <div className="mt-4 p-3 bg-white/60 rounded-lg">
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                  Requirements
                                </h4>
                                <div className="text-sm">
                                  {achievement.requirements.type === 'win_count' && (
                                    <p>Win {achievement.requirements.value} games</p>
                                  )}
                                  {achievement.requirements.type === 'game_count' && (
                                    <p>Play {achievement.requirements.value} games</p>
                                  )}
                                  {achievement.requirements.type === 'win_streak' && (
                                    <p>Win {achievement.requirements.value} games in a row</p>
                                  )}
                                  {achievement.requirements.type === 'tournament_participation' && (
                                    <p>Participate in {achievement.requirements.value} tournaments</p>
                                  )}
                                  {achievement.requirements.type === 'perfect_game' && (
                                    <p>Score a perfect 12 in a game</p>
                                  )}
                                  {achievement.requirements.type === 'special_score_win' && (
                                    <p>Win with {achievement.requirements.targetScore} points ({achievement.requirements.value} times)</p>
                                  )}
                                  {achievement.requirements.type === 'total_points' && (
                                    <p>Accumulate {achievement.requirements.value}+ tournament points</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Please sign in to view your achievement progress.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tournament Achievements View */}
            {viewMode === "tournament-achievements" && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Tournament Competition</h3>
                  <p className="text-sm text-muted-foreground">
                    See which players have earned tournament-specific achievements and compete with your peers.
                  </p>
                </div>
                
                <div className="space-y-8">
                  {Array.from(new Set(tournamentAchievements.map((a: any) => a.tournamentId))).map(tournamentId => {
                    const tournamentName = getTournamentName(tournamentId);
                    const tourAchievements = tournamentAchievements.filter((a: any) => a.tournamentId === tournamentId);
                    
                    return (
                      <div key={tournamentId} className="border rounded-lg p-6">
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-blue-500" />
                          {tournamentName} Achievements
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {tourAchievements.map((achievement: any) => {
                            const isUnlocked = user && isAchievementUnlocked(achievement.id);
                            const progress = user ? getAchievementProgress(achievement.id) : 0;
                            const maxProgress = achievement.requirements?.value || 1;
                            const progressPercentage = Math.min((progress / maxProgress) * 100, 100);
                            
                            return (
                              <Card key={achievement.id} className={`relative overflow-hidden group hover:shadow-lg transition-shadow ${isUnlocked ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${getRarityColor(achievement.rarity)} ${isUnlocked ? 'ring-2 ring-green-400' : ''}`}>
                                        {getAchievementIcon(achievement.icon)}
                                      </div>
                                      <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          {achievement.name}
                                          {isUnlocked && <Trophy className="h-4 w-4 text-green-500" />}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="secondary" className="text-xs">
                                            {getCategoryIcon(achievement.category)}
                                            <span className="ml-1 capitalize">{achievement.category}</span>
                                          </Badge>
                                          <Badge variant="outline" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                                            {achievement.rarity}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-muted-foreground">
                                        {achievement.points} pts
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                
                                <CardContent>
                                  <CardDescription className="text-sm mb-4">
                                    {achievement.description}
                                  </CardDescription>
                                  
                                  {user && (
                                    <div className="mb-4">
                                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Your Progress</span>
                                        <span>{progress}/{maxProgress}</span>
                                      </div>
                                      <Progress value={progressPercentage} className="h-2" />
                                      {isUnlocked && (
                                        <p className="text-xs text-green-600 mt-1 font-medium">✓ You completed this!</p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Tournament Players with this Achievement */}
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <h4 className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">
                                      Tournament Champions
                                    </h4>
                                    <div className="text-sm text-blue-700">
                                      <p>Players who earned this achievement will appear here once data is available.</p>
                                    </div>
                                  </div>
                                  
                                  {achievement.requirements && (
                                    <div className="mt-4 p-3 bg-white/60 rounded-lg">
                                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                        Requirements
                                      </h4>
                                      <div className="text-sm">
                                        {achievement.requirements.type === 'special_score_win' && (
                                          <p>Win with {achievement.requirements.targetScore} points ({achievement.requirements.value} times)</p>
                                        )}
                                        {achievement.requirements.type === 'perfect_game' && (
                                          <p>Score a perfect 12 in a game</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {tournamentAchievements.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tournament-specific achievements found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Achievements Gallery View */}
            {viewMode === "all-achievements" && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">All Available Achievements</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete gallery of all achievements in the system.
                  </p>
                </div>
                
                <Tabs defaultValue="all" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="common">Common</TabsTrigger>
                    <TabsTrigger value="rare">Rare</TabsTrigger>
                    <TabsTrigger value="epic">Epic</TabsTrigger>
                    <TabsTrigger value="legendary">Legendary</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <AchievementGrid achievements={filteredAchievements} />
                  </TabsContent>

                  <TabsContent value="common">
                    <AchievementGrid achievements={achievementsByRarity.common} />
                  </TabsContent>

                  <TabsContent value="rare">
                    <AchievementGrid achievements={achievementsByRarity.rare} />
                  </TabsContent>

                  <TabsContent value="epic">
                    <AchievementGrid achievements={achievementsByRarity.epic} />
                  </TabsContent>

                  <TabsContent value="legendary">
                    <AchievementGrid achievements={achievementsByRarity.legendary} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function AchievementGrid({ achievements }: { achievements: Achievement[] }) {
  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return <Trophy className="h-8 w-8" />;
      case 'flame': return <Flame className="h-8 w-8" />;
      case 'gamepad-2': return <GamepadIcon className="h-8 w-8" />;
      case 'star': return <Star className="h-8 w-8" />;
      case 'crown': return <Crown className="h-8 w-8" />;
      case 'shield': return <Shield className="h-8 w-8" />;
      default: return <Medal className="h-8 w-8" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gameplay': return <GamepadIcon className="h-3 w-3" />;
      case 'social': return <Star className="h-3 w-3" />;
      case 'achievement': return <Trophy className="h-3 w-3" />;
      case 'tournament': return <Crown className="h-3 w-3" />;
      default: return <Medal className="h-4 w-4" />;
    }
  };

  if (achievements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No achievements found in this category.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {achievements.map((achievement) => (
        <Card key={achievement.id} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getRarityColor(achievement.rarity)}`}>
                  {getAchievementIcon(achievement.icon)}
                </div>
                <div>
                  <CardTitle className="text-lg">{achievement.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryIcon(achievement.category)}
                      <span className="ml-1 capitalize">{achievement.category}</span>
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-muted-foreground">
                  {achievement.points} pts
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <CardDescription className="text-sm mb-4">
              {achievement.description}
            </CardDescription>
            
            {achievement.requirements && (
              <div className="mt-4 p-3 bg-white/60 rounded-lg">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Requirements
                </h4>
                <div className="text-sm">
                  {achievement.requirements.type === 'win_count' && (
                    <p>Win {achievement.requirements.value} games</p>
                  )}
                  {achievement.requirements.type === 'game_count' && (
                    <p>Play {achievement.requirements.value} games</p>
                  )}
                  {achievement.requirements.type === 'win_streak' && (
                    <p>Win {achievement.requirements.value} games in a row</p>
                  )}
                  {achievement.requirements.type === 'tournament_participation' && (
                    <p>Participate in {achievement.requirements.value} tournaments</p>
                  )}
                  {achievement.requirements.type === 'perfect_game' && (
                    <p>Score a perfect 12 in a game</p>
                  )}
                  {achievement.requirements.type === 'special_score_win' && (
                    <p>Win with {achievement.requirements.targetScore} points ({achievement.requirements.value} times)</p>
                  )}
                  {achievement.requirements.type === 'total_points' && (
                    <p>Accumulate {achievement.requirements.value}+ tournament points</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}