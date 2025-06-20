import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Tournament } from "@shared/schema";
import { TournamentLeaderboards } from "@/components/leaderboards/tournament-leaderboards";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export default function LeaderboardsPage() {
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch tournaments based on user role
  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery<Tournament[]>({
    queryKey: user?.isAppAdmin ? ["/api/tournaments"] : ["/api/my-tournaments"],
  });

  const availableTournaments = tournaments || [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="py-6"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
                  Leaderboards
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  View tournament standings, player performance, and competitive rankings.
                </p>
              </motion.div>

              {isLoadingTournaments ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </CardContent>
                </Card>
              ) : availableTournaments.length === 0 ? (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-medium">No Active Tournaments</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">There are no active tournaments to display leaderboards for.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="mb-6">
                    <label htmlFor="tournament-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Tournament
                    </label>
                    <Select
                      value={selectedTournament || ""}
                      onValueChange={(value) => setSelectedTournament(value)}
                    >
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Choose a tournament..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTournaments.map((tournament) => (
                          <SelectItem key={tournament.id} value={tournament.id.toString()}>
                            {tournament.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTournament && (
                    <TournamentLeaderboards tournamentId={selectedTournament} />
                  )}
                </>
              )}
            </div>
          </motion.div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}