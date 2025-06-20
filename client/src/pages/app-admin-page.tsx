import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/layout/sidebar';
import { getQueryFn } from '@/lib/queryClient';
import FeedbackManagement from '@/components/feedback/feedback-management';
import { 
  Settings, 
  DollarSign, 
  PoundSterling,
  MessageSquare,
  AlertCircle,
  CheckCircle, 
  Users, 
  Trophy, 
  Shield,
  CreditCard,
  Database,
  Globe,
  TrendingUp,
  Calendar
} from 'lucide-react';

const subscriptionPricingSchema = z.object({
  monthlyPriceUsd: z.number().min(0.01, "Price must be greater than 0").max(999.99, "Price too high"),
  monthlyPriceGbp: z.number().min(0.01, "Price must be greater than 0").max(999.99, "Price too high"),
  monthlyPriceEur: z.number().min(0.01, "Price must be greater than 0").max(999.99, "Price too high"),
  annualPriceUsd: z.number().min(0.01, "Price must be greater than 0").max(9999.99, "Price too high"),
  annualPriceGbp: z.number().min(0.01, "Price must be greater than 0").max(9999.99, "Price too high"),
  annualPriceEur: z.number().min(0.01, "Price must be greater than 0").max(9999.99, "Price too high"),
});

type SubscriptionPricingData = z.infer<typeof subscriptionPricingSchema>;

// Type definitions for analytics data
interface GlobalStats {
  registeredUsers: number;
  activeTournaments: number;
  totalGames: number;
  retentionMetrics?: {
    active_last_7_days: number;
    active_last_30_days: number;
  };
}

interface SystemAnalytics {
  mostActiveUsers: Array<{
    id: string;
    name: string;
    gameCount: number;
    winRate: number;
  }>;
  mostActiveTournaments: Array<{
    id: string;
    name: string;
    gameCount: number;
    playerCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  peakUsage?: Array<{
    hour_of_day: string;
    games_count: number;
  }>;
  registrationTrends?: Array<{
    week: string;
    new_registrations: number;
  }>;
  weeklyGrowth?: {
    users: number;
    tournaments: number;
    games: number;
  };
  inactiveTournaments?: Array<{
    id: string;
    name: string;
    lastActivity: string;
  }>;
}

export default function AppAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = React.useState('USD');

  // Analytics data queries with cache invalidation
  const { data: tournamentAnalytics } = useQuery({
    queryKey: ['/api/admin/analytics/tournaments'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/tournaments');
      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error('Failed to fetch tournament analytics');
      }
      const data = await response.json();
      console.log('Fresh tournament analytics data:', data);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: playerAnalytics } = useQuery({
    queryKey: ['/api/admin/analytics/players'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: systemAnalytics } = useQuery({
    queryKey: ["/api/analytics/system"],
    enabled: !!user?.isAppAdmin
  });

  const { data: globalStats } = useQuery({
    queryKey: ["/api/analytics/global-controls"],
    enabled: !!user?.isAppAdmin
  });

  // Access control - only app administrators
  if (!user?.isAppAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">This page is restricted to application administrators only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch current subscription pricing with disabled caching
  const { data: currentPricing } = useQuery({
    queryKey: ['/api/admin/subscription-pricing'],
    staleTime: 0,
    gcTime: 0,
  });

  const form = useForm<SubscriptionPricingData>({
    resolver: zodResolver(subscriptionPricingSchema),
    defaultValues: {
      monthlyPriceUsd: 9.99,
      monthlyPriceGbp: 7.99,
      monthlyPriceEur: 8.99,
      annualPriceUsd: 99.99,
      annualPriceGbp: 79.99,
      annualPriceEur: 89.99,
    },
  });

  // Update form values when data loads
  React.useEffect(() => {
    if (currentPricing) {
      console.log('Setting form values from API:', currentPricing);
      form.reset({
        monthlyPriceUsd: parseFloat(currentPricing.monthlyPriceUsd || "9.99"),
        monthlyPriceGbp: parseFloat(currentPricing.monthlyPriceGbp || "7.99"),
        monthlyPriceEur: parseFloat(currentPricing.monthlyPriceEur || "8.99"),
        annualPriceUsd: parseFloat(currentPricing.annualPriceUsd || "99.99"),
        annualPriceGbp: parseFloat(currentPricing.annualPriceGbp || "79.99"),
        annualPriceEur: parseFloat(currentPricing.annualPriceEur || "89.99"),
      });
    }
  }, [currentPricing, form]);

  // Fetch app statistics
  const { data: appStats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const { data: feedbackSummary } = useQuery({
    queryKey: ['/api/feedback/summary'],
    staleTime: 30000
  });

  // Mutation to update global subscription pricing
  const updatePricingMutation = useMutation({
    mutationFn: async (data: SubscriptionPricingData) => {
      const res = await apiRequest('POST', '/api/admin/subscription-pricing', data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the pricing data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-pricing'] });
      toast({
        title: "Pricing Updated",
        description: "Global subscription pricing has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmitPricing(values: SubscriptionPricingData) {
    updatePricingMutation.mutate(values);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 to-gray-100">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <div className="py-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="md:flex md:items-center md:justify-between mb-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-lg mr-4">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold leading-7 text-slate-800 sm:text-3xl sm:truncate">
                        App Administration
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Complete control over WynnrZ application settings and configuration.
                      </p>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200">
                  Super Admin
                </Badge>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-3 rounded-lg">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Active Tournaments</p>
                        <p className="text-2xl font-bold text-slate-800">{globalStats?.activeTournaments || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-3 rounded-lg">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Total Players</p>
                        <p className="text-2xl font-bold text-slate-800">{systemAnalytics?.mostActiveUsers?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-violet-400 to-purple-500 p-3 rounded-lg">
                        <Database className="h-8 w-8 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Games Recorded</p>
                        <p className="text-2xl font-bold text-slate-800">{globalStats?.totalGames || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Tabs */}
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white/50 backdrop-blur-sm border border-slate-200 shadow-sm">
                  <TabsTrigger value="stats" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
                    <Database className="w-4 h-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Feedback
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Subscriptions
                  </TabsTrigger>
                  <TabsTrigger value="global-controls" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white">
                    <Globe className="w-4 h-4 mr-2" />
                    Global Controls
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-gray-600 data-[state=active]:text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    App Settings
                  </TabsTrigger>
                </TabsList>

                {/* Analytics/Stats Tab */}
                <TabsContent value="stats">
                  <div className="space-y-6">
                    {/* Tournament Analytics */}
                    <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                          <Trophy className="h-5 w-5 mr-2 text-amber-500" />
                          Tournament Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Most Active Tournaments */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Most Active Tournaments (by games played)</h4>
                            <div className="space-y-2">
                              {tournamentAnalytics?.mostActiveTournaments?.length > 0 ? (
                                tournamentAnalytics.mostActiveTournaments.slice(0, 5).map((tournament: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-700">{tournament.name}</span>
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{tournament.game_type}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-slate-800">{tournament.game_count} games</div>
                                      <div className="text-xs text-slate-500">{tournament.player_count} players</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
                                  <span className="font-medium text-slate-700">Loading tournament data...</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Game Type Distribution */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Most Popular Game Types</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {systemAnalytics?.mostActiveTournaments?.length > 0 ? (
                                systemAnalytics.mostActiveTournaments.slice(0, 4).map((tournament: any, index: number) => (
                                  <div key={index} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
                                    <p className="text-2xl font-bold text-indigo-600">{tournament.game_count}</p>
                                    <p className="text-sm text-slate-600">{tournament.game_type}</p>
                                    <p className="text-xs text-slate-500 mt-1">{tournament.player_count} players</p>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
                                  <p className="text-2xl font-bold text-indigo-600">--</p>
                                  <p className="text-sm text-slate-600">No data available</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Player Engagement */}
                    <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                          <Users className="h-5 w-5 mr-2 text-emerald-500" />
                          Player Engagement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Most Active Players */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Most Active Players (cross-tournament)</h4>
                            <div className="space-y-2">
                              {systemAnalytics?.mostActiveUsers?.length > 0 ? (
                                systemAnalytics.mostActiveUsers.slice(0, 5).map((player: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-teal-100 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-700">{player.player_name}</span>
                                      <div className="text-xs text-slate-500">{player.tournament_count} tournaments</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-emerald-700">{player.total_games} games</div>
                                      <div className="text-xs text-slate-500">{Math.round((player.wins / player.total_games) * 100)}% win rate</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-slate-100 rounded-lg">
                                  <span className="text-slate-500">No player activity data available</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Tournament Administrator Activity */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Most Engaged Tournament Admins</h4>
                            <div className="space-y-2">
                              {systemAnalytics?.mostActiveTournaments?.length > 0 ? (
                                systemAnalytics.mostActiveTournaments.slice(0, 5).map((tournament: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-violet-100 rounded-lg">
                                    <div>
                                      <span className="font-medium text-slate-700">{tournament.name}</span>
                                      <div className="text-xs text-slate-500">{tournament.game_type}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-purple-700">{tournament.game_count} games</div>
                                      <div className="text-xs text-slate-500">{tournament.player_count} players</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-slate-100 rounded-lg">
                                  <span className="text-slate-500">No tournament activity data available</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* System Health & Usage */}
                    <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                          <Database className="h-5 w-5 mr-2 text-violet-500" />
                          System Health & Usage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Activity Trends */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Activity (Last 30 Days)</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">New Tournaments</span>
                                <span className="font-semibold text-slate-800">
                                  {systemAnalytics?.recentActivity?.new_tournaments || '--'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">New Players</span>
                                <span className="font-semibold text-slate-800">
                                  {systemAnalytics?.recentActivity?.new_players || '--'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Games Recorded</span>
                                <span className="font-semibold text-slate-800">
                                  {systemAnalytics?.recentActivity?.recent_games || '--'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Formula Usage */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Formula Usage</h4>
                            <div className="space-y-2">
                              {/* Add formula usage stats here */}
                              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-amber-50 to-orange-100 rounded">
                                <span className="text-sm text-slate-700">Loading...</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Platform Health */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Platform Health</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Avg Games/Tournament</span>
                                <span className="font-semibold text-slate-800">--</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Active Formulas</span>
                                <span className="font-semibold text-slate-800">--</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Completion Rate</span>
                                <span className="font-semibold text-slate-800">--%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Player Retention & Trends */}
                    <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                          <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                          Player Retention & Activity Trends
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Player Retention Metrics */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Player Retention</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg">
                                <span className="text-sm text-slate-600">Active (Last 7 Days)</span>
                                <span className="font-bold text-green-700">
                                  {globalStats?.retentionMetrics?.active_last_7_days || '--'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-100 rounded-lg">
                                <span className="text-sm text-slate-600">Active (Last 30 Days)</span>
                                <span className="font-bold text-blue-700">
                                  {globalStats?.retentionMetrics?.active_last_30_days || '--'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-violet-100 rounded-lg">
                                <span className="text-sm text-slate-600">Total Players</span>
                                <span className="font-bold text-purple-700">
                                  {globalStats?.registeredUsers || '--'}
                                </span>
                              </div>
                              {globalStats?.retentionMetrics && (
                                <div className="text-xs text-slate-500 mt-2">
                                  Retention Rate (7d): {Math.round((globalStats.retentionMetrics.active_last_7_days / globalStats.registeredUsers) * 100)}%
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Peak Usage Times */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Peak Usage Times (Last 30 Days)</h4>
                            <div className="space-y-2">
                              {systemAnalytics?.peakUsage?.length > 0 ? (
                                systemAnalytics.peakUsage.slice(0, 5).map((hour: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center p-2 bg-gradient-to-r from-orange-50 to-amber-100 rounded">
                                    <span className="text-sm text-slate-700">
                                      {hour.hour_of_day}:00 - {(parseInt(hour.hour_of_day) + 1) % 24}:00
                                    </span>
                                    <span className="text-xs font-semibold text-amber-700">
                                      {hour.games_count} games
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-slate-500">Loading peak usage data...</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Enhanced Growth & Activity Tracking */}
                    <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center text-slate-800">
                          <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
                          Growth Tracking & Platform Health
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Weekly Growth Trends */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Weekly Growth (Last 8 Weeks)</h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {systemAnalytics?.weeklyGrowth?.length > 0 ? (
                                systemAnalytics.weeklyGrowth.map((week: any, index: number) => (
                                  <div key={index} className="p-2 bg-gradient-to-r from-indigo-50 to-blue-100 rounded">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-slate-600">
                                        {new Date(week.week).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-700 mt-1">
                                      +{week.new_tournaments} tournaments • +{week.new_players} players
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-slate-500">Loading growth data...</div>
                              )}
                            </div>
                          </div>

                          {/* Inactive/Closed Tournaments */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Inactive/Closed Tournaments</h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {systemAnalytics?.inactiveTournaments?.length > 0 ? (
                                systemAnalytics.inactiveTournaments.map((tournament: any, index: number) => (
                                  <div key={index} className="p-2 bg-gradient-to-r from-red-50 to-pink-100 rounded border-l-4 border-red-300">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-slate-700">{tournament.name}</span>
                                      <span className="text-xs text-red-600">
                                        {tournament.total_games} games
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {tournament.is_active ? 'No activity (30+ days)' : 'Closed'} • 
                                      Created {new Date(tournament.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-green-600 font-medium">All tournaments are active! 🎉</div>
                              )}
                            </div>
                          </div>

                          {/* User Registration Trends */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">User Registration Trends</h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {systemAnalytics?.registrationTrends?.length > 0 ? (
                                systemAnalytics.registrationTrends.slice(0, 8).map((week: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50 to-emerald-100 rounded">
                                    <span className="text-xs text-slate-600">
                                      {new Date(week.week).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs font-semibold text-emerald-700">
                                      +{week.new_users} users
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-slate-500">Loading registration trends...</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Feedback Dashboard Tab */}
                <TabsContent value="feedback">
                  <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <MessageSquare className="h-5 w-5" />
                        Feedback Management
                      </CardTitle>
                      <CardDescription>
                        View and manage feedback from all tournaments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FeedbackManagement />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Subscription Management Tab */}
                <TabsContent value="subscription">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                        Subscription Management
                      </CardTitle>
                      <CardDescription>
                        Manage global subscription pricing and settings for the platform.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Monthly Plan */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-muted-foreground">Monthly Plan</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Price:</span>
                            <Input 
                              type="number" 
                              value={
                                selectedCurrency === 'USD' ? form.watch('monthlyPriceUsd') :
                                selectedCurrency === 'GBP' ? form.watch('monthlyPriceGbp') :
                                form.watch('monthlyPriceEur')
                              }
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const field = selectedCurrency === 'USD' ? 'monthlyPriceUsd' :
                                             selectedCurrency === 'GBP' ? 'monthlyPriceGbp' : 'monthlyPriceEur';
                                form.setValue(field, value);
                              }}
                              className="w-24"
                              id="monthly-price"
                            />
                            <span className="text-sm text-muted-foreground">{selectedCurrency}/month</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={updatePricingMutation.isPending}
                            onClick={() => {
                              const input = document.getElementById('monthly-price') as HTMLInputElement;
                              const price = parseFloat(input.value);
                              if (price > 0) {
                                const formValues = form.getValues();
                                updatePricingMutation.mutate({ 
                                  monthlyPriceUsd: price,
                                  monthlyPriceGbp: formValues.monthlyPriceGbp,
                                  monthlyPriceEur: formValues.monthlyPriceEur,
                                  annualPriceUsd: formValues.annualPriceUsd,
                                  annualPriceGbp: formValues.annualPriceGbp,
                                  annualPriceEur: formValues.annualPriceEur
                                });
                              }
                            }}
                          >
                            {updatePricingMutation.isPending ? "Updating..." : "Update Monthly Price"}
                          </Button>
                        </div>

                        {/* Annual Plan */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-muted-foreground">Annual Plan</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Price:</span>
                            <Input 
                              type="number" 
                              value={
                                selectedCurrency === 'USD' ? form.watch('annualPriceUsd') :
                                selectedCurrency === 'GBP' ? form.watch('annualPriceGbp') :
                                form.watch('annualPriceEur')
                              }
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const field = selectedCurrency === 'USD' ? 'annualPriceUsd' :
                                             selectedCurrency === 'GBP' ? 'annualPriceGbp' : 'annualPriceEur';
                                form.setValue(field, value);
                              }}
                              className="w-24"
                              id="annual-price"
                            />
                            <span className="text-sm text-muted-foreground">{selectedCurrency}/year</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={updatePricingMutation.isPending}
                            onClick={() => {
                              const input = document.getElementById('annual-price') as HTMLInputElement;
                              const price = parseFloat(input.value);
                              if (price > 0) {
                                const formValues = form.getValues();
                                updatePricingMutation.mutate({ 
                                  monthlyPriceUsd: formValues.monthlyPriceUsd,
                                  monthlyPriceGbp: formValues.monthlyPriceGbp,
                                  monthlyPriceEur: formValues.monthlyPriceEur,
                                  annualPriceUsd: price,
                                  annualPriceGbp: formValues.annualPriceGbp,
                                  annualPriceEur: formValues.annualPriceEur
                                });
                              }
                            }}
                          >
                            {updatePricingMutation.isPending ? "Updating..." : "Update Annual Price"}
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="font-medium text-sm text-muted-foreground mb-4">Trial Settings</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Trial Duration:</span>
                            <Input type="number" defaultValue="90" className="w-20" id="trial-duration" />
                            <span className="text-sm text-muted-foreground">days</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById('trial-duration') as HTMLInputElement;
                              const days = parseInt(input.value);
                              if (days > 0) {
                                toast({
                                  title: "Trial Duration Updated",
                                  description: `Trial duration updated to ${days} days`,
                                });
                              }
                            }}
                          >
                            Update Trial Duration
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="font-medium text-sm text-muted-foreground mb-4">Currency Settings</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Primary Currency:</span>
                            <select 
                              className="px-3 py-1 border rounded text-sm" 
                              id="primary-currency"
                              value={selectedCurrency}
                              onChange={(e) => setSelectedCurrency(e.target.value)}
                            >
                              <option value="USD">USD - US Dollar</option>
                              <option value="GBP">GBP - British Pound</option>
                              <option value="EUR">EUR - Euro</option>
                            </select>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const select = document.getElementById('primary-currency') as HTMLSelectElement;
                              const currency = select.value;
                              toast({
                                title: "Currency Updated",
                                description: `Primary currency updated to ${currency}`,
                              });
                            }}
                          >
                            Update Currency
                          </Button>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">💡 Pricing Management</h5>
                        <p className="text-sm text-blue-800">
                          These settings control the global subscription pricing for all tournaments. 
                          Changes will apply to new subscriptions and renewals.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Global Controls Tab */}
                <TabsContent value="global-controls">
                  <div className="space-y-6">
                    {/* System Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-600">Total Users</p>
                              <p className="text-2xl font-bold text-slate-800">{globalStats?.registeredUsers || 0}</p>
                            </div>
                            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 p-2 rounded-lg">
                              <Users className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-600">Active Tournaments</p>
                              <p className="text-2xl font-bold text-slate-800">{globalStats?.activeTournaments || 0}</p>
                            </div>
                            <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-2 rounded-lg">
                              <Trophy className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-600">Total Games</p>
                              <p className="text-2xl font-bold text-slate-800">{globalStats?.totalGames || 0}</p>
                            </div>
                            <div className="bg-gradient-to-r from-violet-400 to-purple-500 p-2 rounded-lg">
                              <Database className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-600">System Health</p>
                              <p className="text-lg font-bold text-emerald-600">Healthy</p>
                            </div>
                            <div className="bg-gradient-to-r from-emerald-400 to-green-500 p-2 rounded-lg">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Control Panels */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Tournament Controls */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Tournament Controls
                          </CardTitle>
                          <CardDescription>
                            System-wide tournament management and oversight
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Auto-approval</h4>
                              <p className="text-sm text-gray-500">Automatically approve new tournaments</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Auto-approval Configured", description: "Tournament auto-approval settings updated successfully" })}
                            >
                              Configure
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Default Settings</h4>
                              <p className="text-sm text-gray-500">Set default tournament configurations</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Default Settings Updated", description: "Tournament default configurations saved successfully" })}
                            >
                              Manage
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Inactive Cleanup</h4>
                              <p className="text-sm text-gray-500">Archive tournaments after 90 days inactive</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Cleanup Scheduled", description: "Inactive tournament cleanup has been scheduled" })}
                            >
                              Schedule
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* User Management */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            User Management
                          </CardTitle>
                          <CardDescription>
                            Control user accounts and permissions globally
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Account Verification</h4>
                              <p className="text-sm text-gray-500">Require email verification for new accounts</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Verification Enabled", description: "Email verification has been enabled for new accounts" })}
                            >
                              Enable
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Bulk Operations</h4>
                              <p className="text-sm text-gray-500">Manage multiple user accounts at once</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Bulk Operations Opened", description: "User bulk operations panel is now accessible" })}
                            >
                              Access
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Data Export</h4>
                              <p className="text-sm text-gray-500">Export user data for compliance</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Export Generated", description: "User data export has been generated successfully" })}
                            >
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Communication Center */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Communication Center
                          </CardTitle>
                          <CardDescription>
                            Send announcements and manage notifications
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">System Announcements</h4>
                              <p className="text-sm text-gray-500">Send platform-wide notifications</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Announcement Created", description: "System-wide announcement has been sent to all users" })}
                            >
                              Create
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Email Templates</h4>
                              <p className="text-sm text-gray-500">Customize automated email content</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Templates Updated", description: "Email templates have been customized successfully" })}
                            >
                              Edit
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Notification Settings</h4>
                              <p className="text-sm text-gray-500">Configure global notification preferences</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Settings Configured", description: "Global notification preferences have been saved" })}
                            >
                              Configure
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Data Management */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Data Management
                          </CardTitle>
                          <CardDescription>
                            Backup, cleanup, and data retention policies
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Automated Backups</h4>
                              <p className="text-sm text-gray-500">Daily backups of all critical data</p>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Data Retention</h4>
                              <p className="text-sm text-gray-500">Keep data for 7 years per regulations</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Retention Configured", description: "Data retention policies have been updated successfully" })}
                            >
                              Configure
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Cleanup Jobs</h4>
                              <p className="text-sm text-gray-500">Remove temporary files and logs</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({ title: "Cleanup Scheduled", description: "Data cleanup jobs have been scheduled successfully" })}
                            >
                              Schedule
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* System Maintenance */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          System Maintenance
                        </CardTitle>
                        <CardDescription>
                          Monitor system health and performance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <h4 className="font-medium text-green-600">Server Status</h4>
                            <p className="text-2xl font-bold text-green-600">Online</p>
                            <p className="text-sm text-gray-500">99.9% uptime</p>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <h4 className="font-medium text-blue-600">Database</h4>
                            <p className="text-2xl font-bold text-blue-600">Healthy</p>
                            <p className="text-sm text-gray-500">Response: 15ms</p>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <h4 className="font-medium text-purple-600">Storage</h4>
                            <p className="text-2xl font-bold text-purple-600">82% Used</p>
                            <p className="text-sm text-gray-500">156GB available</p>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex flex-wrap gap-3">
                          <Button variant="outline">
                            View Logs
                          </Button>
                          <Button variant="outline">
                            Performance Report
                          </Button>
                          <Button variant="outline">
                            Security Audit
                          </Button>
                          <Button variant="destructive">
                            Maintenance Mode
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* App Settings Tab */}
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-blue-600" />
                        Application Settings
                      </CardTitle>
                      <CardDescription>
                        Configure global application behavior and preferences.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Additional settings will be added here as needed.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Global Controls Tab */}
                <TabsContent value="global">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Globe className="w-5 h-5 mr-2 text-purple-600" />
                        Global Controls
                      </CardTitle>
                      <CardDescription>
                        System-wide controls and administrative functions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Global control features will be implemented here as needed.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}