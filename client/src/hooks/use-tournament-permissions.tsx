import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

/**
 * Hook to check if the current user has admin or result recording permissions for a tournament
 */
export function useTournamentPermissions(tournamentId: string | null | undefined) {
  const { user } = useAuth();
  
  // Get tournament details to check if user is creator
  const { data: tournament } = useQuery({
    queryKey: tournamentId ? [`/api/tournaments/${tournamentId}`] : [],
    enabled: !!tournamentId && !!user,
  });
  
  // Get tournament players with their roles
  const { data: tournamentPlayers, isLoading } = useQuery({
    queryKey: tournamentId ? [`/api/tournaments/${tournamentId}/players`] : [],
    enabled: !!tournamentId && !!user,
  });
  
  // Check if user is the tournament creator
  const isCreator = tournament?.createdBy === user?.id;
  
  // Find the current user's player role in this tournament
  const currentUserPlayer = tournamentPlayers?.find(player => 
    player.id === user?.id || player.email === user?.email
  );
  
  // Check permissions - creators are automatically admins
  const isAdmin = isCreator || !!currentUserPlayer?.isAdministrator;
  const canRecordResults = isCreator || !!currentUserPlayer?.canRecordResults || isAdmin;
  
  return {
    isAdmin,
    canRecordResults,
    isLoading,
    currentUserPlayer,
    isCreator
  };
}