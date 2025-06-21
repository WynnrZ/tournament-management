import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team, Player } from "@shared/schema";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TeamForm from "./team-form";

interface TeamListProps {
  tournamentId: string;
}

export default function TeamList({ tournamentId }: TeamListProps) {
  const [addTeamDialogOpen, setAddTeamDialogOpen] = useState(false);
  
  // Fetch teams for this tournament
  const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Teams</h3>
        <Button 
          size="sm" 
          onClick={() => setAddTeamDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {isLoadingTeams ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teams?.length === 0 ? (
        <div className="text-center p-6">
          <Users className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <p className="text-gray-500 mt-4 mb-4">No teams in this tournament yet.</p>
          <Button size="sm" onClick={() => setAddTeamDialogOpen(true)}>
            Create First Team
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Players</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams?.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>{team.description || "-"}</TableCell>
                <TableCell>{team.playerCount || "-"}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = `/teams/${team.id}`}
                  >
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Team Dialog */}
      <Dialog open={addTeamDialogOpen} onOpenChange={setAddTeamDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Add a new team to your tournament by selecting players to form the team.
            </DialogDescription>
          </DialogHeader>
          <TeamForm 
            tournamentId={tournamentId}
            onSuccess={() => setAddTeamDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}