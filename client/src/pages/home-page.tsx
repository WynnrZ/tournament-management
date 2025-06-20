import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import StatCard from "@/components/dashboard/stat-card";
import TournamentCard from "@/components/tournaments/tournament-card";
import GameResultItem from "@/components/games/game-result-item";
import LeaderboardTable from "@/components/leaderboard/leaderboard-table";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Plus } from "lucide-react";
import { Tournament } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubscriptionStatusBanner } from "@/components/subscription/subscription-status-banner";
import { SubscriptionTestBanner } from "@/components/subscription/subscription-test-banner";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { ActivityFeed } from "@/components/social/activity-feed";
import { useTranslation } from "@/lib/simple-i18n";

export default function HomePage() {
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation();

  const isAdmin = (user as any)?.isAdmin === true || (user as any)?.is_admin === true;
  const isAppAdmin = (user as any)?.isAppAdmin === true || (user as any)?.is_app_admin === true;

  // Fetch user's specific tournaments (where they are creator or participant)
  const { data: userTournaments, isLoading: isLoadingTournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/my-tournaments"],
  });

  // Fetch user's specific games from their tournaments
  const { data: userGames, isLoading: isLoadingGames } = useQuery({
    queryKey: ["/api/my-games"],
  });

  // Calculate personalized stats from user's data
  const personalStats = {
    activeTournaments: userTournaments?.filter(t => t.isActive).length || 0,
    gamesRecorded: userGames?.length || 0,
    totalTournaments: userTournaments?.length || 0,
  };

  // Get active tournaments for cards
  const activeTournaments = userTournaments?.filter(t => t.isActive) || [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 to-gray-100">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="py-6"
          >
            {/* Dashboard Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Subscription Status Banner */}
              <SubscriptionStatusBanner />
              
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 p-8 mb-8"
              >
                <div className="md:flex md:items-center md:justify-between">
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <h2 className="text-3xl font-bold leading-7 text-slate-800 sm:text-4xl sm:truncate bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Competitive Excellence Starts Here
                      </h2>
                      <p className="mt-2 text-lg text-slate-600 font-medium">
                        Whether it's one-on-one or team versus team competition, this platform transforms casual games into meaningful rivalries.
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Anyone can win once, but consistent performance over time reveals true skill. End the debates – let the data determine who truly reigns supreme among your friends.
                      </p>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 flex md:mt-0 md:ml-4 gap-3"
                  >
                    <Button variant="outline" size="sm" className="bg-white/50 backdrop-blur-sm border-slate-300 hover:bg-white/80 transition-all duration-300">
                      <FileText className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                    <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                      <Plus className="mr-2 h-4 w-4" />
                      New Tournament
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {isLoadingTournaments || isLoadingGames ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white shadow rounded-lg h-32 animate-pulse" />
                  ))
                ) : (
                  <>
                    <StatCard 
                      title={t('dashboard.stats.tournaments')} 
                      value={personalStats.activeTournaments} 
                      icon="file" 
                      color="primary" 
                      link="/tournaments" 
                      linkText={t('common.view')} 
                    />
                    <StatCard 
                      title={t('dashboard.stats.games')} 
                      value={personalStats.gamesRecorded} 
                      icon="zap" 
                      color="accent" 
                      link="/tournaments" 
                      linkText={t('common.view')} 
                    />
                    <StatCard 
                      title="My Tournaments" 
                      value={personalStats.totalTournaments} 
                      icon="users" 
                      color="indigo" 
                      link="/tournaments" 
                      linkText={t('common.view')} 
                    />
                    <StatCard 
                      title="Recent Activity" 
                      value="Today" 
                      icon="clock" 
                      color="pink" 
                      link="/tournaments" 
                      linkText="View tournaments" 
                    />
                  </>
                )}
              </div>
            </motion.div>

            {/* Active Tournaments */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Active Tournaments</h3>
                {activeTournaments.length > 6 && (
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View All ({userTournaments?.length || 0})
                  </Button>
                )}
              </div>
              {isLoadingTournaments ? (
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-white shadow rounded-lg h-80 animate-pulse" />
                  ))}
                </div>
              ) : activeTournaments.length === 0 ? (
                <div className="mt-5 bg-white shadow rounded-lg p-6 text-center">
                  <p className="text-gray-500">No active tournaments found.</p>
                  <Button className="mt-4" size="sm">Create a Tournament</Button>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(activeTournaments.length > 8 ? activeTournaments.slice(0, 8) : activeTournaments).map((tournament) => (
                    <TournamentCard 
                      key={tournament.id} 
                      tournament={tournament} 
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Activity Feed Section */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
            >
              <ActivityFeed limit={10} />
            </motion.div>



            {/* Recent Games & Leaderboard */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Recent Games */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 }}
                  className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-xl rounded-2xl border border-slate-200/60"
                >
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Games</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest game results across all tournaments.</p>
                  </div>
                  <div className="border-t border-gray-200">
                    <div className="overflow-hidden">
                      {isLoadingGames ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : userGames?.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          No games recorded yet.
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {userGames?.slice(0, 5).map((game) => (
                            <GameResultItem key={game.id} game={game} />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex justify-center">
                      <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-900">View all games</a>
                    </div>
                  </div>
                </motion.div>
                
                {/* Top Leaderboard */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 }}
                  className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-xl rounded-2xl border border-slate-200/60"
                >
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Top Leaderboard</h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {selectedTournament 
                          ? userTournaments?.find(t => t.id === selectedTournament)?.name 
                          : "Select a tournament"}
                      </p>
                    </div>
                    <div>
                      <Select 
                        value={selectedTournament?.toString() || ""} 
                        onValueChange={(value) => setSelectedTournament(Number(value))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select a tournament" />
                        </SelectTrigger>
                        <SelectContent>
                          {userTournaments?.map((tournament) => (
                            <SelectItem key={tournament.id} value={tournament.id.toString()}>
                              {tournament.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border-t border-gray-200">
                    {selectedTournament ? (
                      <LeaderboardTable tournamentId={selectedTournament} />
                    ) : (
                      <div className="p-10 text-center text-gray-500">
                        Please select a tournament to view the leaderboard.
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex justify-center">
                      <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-900">View full standings</a>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
