import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTournamentPermissions } from "@/hooks/use-tournament-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ClipboardCheck, UserX } from "lucide-react";
import { PlayerPermissions } from "./player-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlayerListProps {
  tournamentId: string;
  onRemovePlayer: (playerId: string) => void;
}

export function PlayerListWithPermissions({ tournamentId, onRemovePlayer }: PlayerListProps) {
  const { toast } = useToast();
  const { isAdmin } = useTournamentPermissions(tournamentId);
  
  // Fetch players in this tournament
  const { data: players, isLoading } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/players`],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No players have joined this tournament yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {players.map((player) => (
        <Card key={player.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                {player.name}
                {player.isAdministrator && (
                  <Badge variant="default" className="flex items-center gap-1 bg-amber-500 text-white font-medium ml-2">
                    <Shield size={14} /> Administrator
                  </Badge>
                )}
                {player.canRecordResults && !player.isAdministrator && (
                  <Badge variant="outline" className="flex items-center gap-1 bg-primary/10">
                    <ClipboardCheck size={14} className="text-primary" /> Can Record
                  </Badge>
                )}
              </CardTitle>
              
              {isAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <UserX className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Remove Player</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to remove {player.name} from this tournament?
                        All their game results will remain but they will no longer be able to participate.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          onRemovePlayer(player.id);
                          toast({
                            title: "Player removed",
                            description: `${player.name} has been removed from the tournament`,
                          });
                        }}
                      >
                        Remove Player
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {player.email && <p className="text-sm text-muted-foreground mt-1">{player.email}</p>}
          </CardHeader>
          
          <CardContent>
            {isAdmin && (
              <>
                <Separator className="my-2" />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Player Permissions</h4>
                  <PlayerPermissions tournamentId={tournamentId} player={player} />
                </div>
              </>
            )}
            
            {/* Show current permissions for non-admins */}
            {!isAdmin && (player.isAdministrator || player.canRecordResults) && (
              <>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Current Permissions</h4>
                  <div className="flex gap-2">
                    {player.isAdministrator && (
                      <Badge variant="default" className="bg-amber-500">
                        <Shield size={12} className="mr-1" /> Administrator
                      </Badge>
                    )}
                    {player.canRecordResults && (
                      <Badge variant="outline">
                        <ClipboardCheck size={12} className="mr-1" /> Can Record Results
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}