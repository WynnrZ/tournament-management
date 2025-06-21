import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTournamentPermissions } from "@/hooks/use-tournament-permissions";
import { Shield, ClipboardCheck, Calculator } from "lucide-react";

interface PlayerPermissionsProps {
  tournamentId: string;
  player: {
    id: string;
    name: string;
    isAdministrator?: boolean;
    canRecordResults?: boolean;
    canManageFormulas?: boolean;
  };
}

export function PlayerPermissions({ tournamentId, player }: PlayerPermissionsProps) {
  const { toast } = useToast();
  const { isAdmin } = useTournamentPermissions(tournamentId);
  const [isAdministrator, setIsAdministrator] = useState(!!player.isAdministrator);
  const [canRecordResults, setCanRecordResults] = useState(!!player.canRecordResults);
  const [canManageFormulas, setCanManageFormulas] = useState(!!player.canManageFormulas);

  // Update player permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { isAdministrator?: boolean; canRecordResults?: boolean; canManageFormulas?: boolean }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/tournaments/${tournamentId}/players/${player.id}/permissions`, 
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/players`] });
      toast({
        title: "Permissions updated",
        description: `Updated permissions for ${player.name}`,
      });
    },
    onError: (error) => {
      // Reset switches to original values on error
      setIsAdministrator(!!player.isAdministrator);
      setCanRecordResults(!!player.canRecordResults);
      setCanManageFormulas(!!player.canManageFormulas);
      
      toast({
        title: "Failed to update permissions",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAdministratorChange = (checked: boolean) => {
    setIsAdministrator(checked);
    updatePermissionsMutation.mutate({ isAdministrator: checked });
  };

  const handleRecordResultsChange = (checked: boolean) => {
    setCanRecordResults(checked);
    updatePermissionsMutation.mutate({ canRecordResults: checked });
  };

  const handleManageFormulasChange = (checked: boolean) => {
    setCanManageFormulas(checked);
    updatePermissionsMutation.mutate({ canManageFormulas: checked });
  };

  // Only administrators can change permissions
  if (!isAdmin) return null;

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Switch
          id={`admin-${player.id}`}
          checked={isAdministrator}
          onCheckedChange={handleAdministratorChange}
          disabled={updatePermissionsMutation.isPending}
        />
        <Label htmlFor={`admin-${player.id}`} className="flex items-center gap-1">
          <Shield size={16} className="text-primary" /> Admin
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id={`record-${player.id}`}
          checked={canRecordResults}
          onCheckedChange={handleRecordResultsChange}
          disabled={updatePermissionsMutation.isPending}
        />
        <Label htmlFor={`record-${player.id}`} className="flex items-center gap-1">
          <ClipboardCheck size={16} className="text-primary" /> Record Results
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id={`formulas-${player.id}`}
          checked={canManageFormulas}
          onCheckedChange={handleManageFormulasChange}
          disabled={updatePermissionsMutation.isPending}
        />
        <Label htmlFor={`formulas-${player.id}`} className="flex items-center gap-1">
          <Calculator size={16} className="text-primary" /> Manage Formulas
        </Label>
      </div>
    </div>
  );
}