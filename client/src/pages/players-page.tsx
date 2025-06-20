import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Player, Tournament } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, UserPlus, Edit2, Trash2, BarChart3, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import PlayerForm from "@/components/players/player-form";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function PlayersPage() {
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [editPlayerDialogOpen, setEditPlayerDialogOpen] = useState(false);
  const [deletePlayerDialogOpen, setDeletePlayerDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch players
  const { data: players, isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Filter players based on search query
  const filteredPlayers = players?.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (player.email && player.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Delete player mutation
  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: number) => {
      const res = await apiRequest("DELETE", `/api/players/${playerId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Player deleted",
        description: "The player has been deleted successfully.",
      });
      setDeletePlayerDialogOpen(false);
      setSelectedPlayer(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting player",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

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
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
                  Players
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Manage competitors and build your roster of skilled players ready to dominate the competition.
                </p>
              </motion.div>
              
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                  <Button onClick={() => setAddPlayerDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Player
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search players..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Players Table */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <Card>
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : players?.length === 0 ? (
                  <div className="text-center p-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
                    <p className="text-gray-500 mb-4">You haven't added any players yet.</p>
                    <Button onClick={() => setAddPlayerDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add First Player
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Tournaments</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers?.map(player => (
                          <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>{player.email || "-"}</TableCell>
                            <TableCell>{player.contact || "-"}</TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">Thornton</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => window.location.href = `/players/${player.id}/analytics`}
                                >
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Analytics
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.location.href = `/players/${player.id}`}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Profile
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    setEditPlayerDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    setDeletePlayerDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        </main>
      </div>
      
      <MobileNav />

      {/* Add Player Dialog */}
      <Dialog open={addPlayerDialogOpen} onOpenChange={setAddPlayerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
          </DialogHeader>
          <PlayerForm
            standalone={true}
            onSuccess={() => {
              setAddPlayerDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/players"] });
              toast({
                title: "Player added!",
                description: "The player has been added successfully."
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={editPlayerDialogOpen} onOpenChange={setEditPlayerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update player information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          {selectedPlayer && (
            <PlayerForm
              player={selectedPlayer}
              onSuccess={() => {
                setEditPlayerDialogOpen(false);
                setSelectedPlayer(null);
                queryClient.invalidateQueries({ queryKey: ["/api/players"] });
                toast({
                  title: "Player updated!",
                  description: "The player has been updated successfully."
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Player Confirmation Dialog */}
      <Dialog open={deletePlayerDialogOpen} onOpenChange={setDeletePlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedPlayer?.name}</strong>? 
              This action cannot be undone. The player will be removed from all tournaments 
              and their game history will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletePlayerDialogOpen(false);
                setSelectedPlayer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPlayer) {
                  deletePlayerMutation.mutate(selectedPlayer.id);
                }
              }}
              disabled={deletePlayerMutation.isPending}
            >
              {deletePlayerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Player"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
