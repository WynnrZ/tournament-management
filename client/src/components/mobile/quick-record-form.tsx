import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const quickGameSchema = z.object({
  tournamentId: z.string().min(1, "Tournament is required"),
  date: z.string().min(1, "Date is required"),
  player1Id: z.string().min(1, "Player 1 is required"),
  player2Id: z.string().min(1, "Player 2 is required"),
  player1Score: z.string().min(1, "Score is required"),
  player2Score: z.string().min(1, "Score is required"),
  winnerId: z.string().min(1, "Winner must be selected"),
  notes: z.string().optional(),
}).refine((data) => data.player1Id !== data.player2Id, {
  message: "A player cannot compete against themselves",
  path: ["player2Id"],
});

interface QuickRecordFormProps {
  tournamentId?: string;
  onSuccess?: () => void;
}

export default function QuickRecordForm({ tournamentId, onSuccess }: QuickRecordFormProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof quickGameSchema>>({
    resolver: zodResolver(quickGameSchema),
    defaultValues: {
      tournamentId: tournamentId || "",
      date: new Date().toISOString().split('T')[0],
      player1Id: "",
      player2Id: "",
      player1Score: "",
      player2Score: "",
      winnerId: "",
      notes: "",
    },
  });

  const selectedTournamentId = form.watch("tournamentId");

  // Fetch tournaments for selection
  const { data: tournaments = [] } = useQuery({
    queryKey: ["/api/my-tournaments"],
  });

  const { data: players = [] } = useQuery({
    queryKey: [`/api/tournaments/${selectedTournamentId}/players`],
    enabled: !!selectedTournamentId,
  });

  const recordGameMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quickGameSchema>) => {
      const gameData = {
        date: data.date,
        tournamentId: data.tournamentId,
        isTeamGame: false,
        participants: [
          {
            playerId: parseInt(data.player1Id),
            score: data.player1Score,
            isWinner: data.winnerId === data.player1Id,
          },
          {
            playerId: parseInt(data.player2Id),
            score: data.player2Score,
            isWinner: data.winnerId === data.player2Id,
          },
        ],
        notes: data.notes || "",
      };

      const res = await apiRequest("POST", "/api/games", gameData);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: "Game recorded successfully",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${variables.tournamentId}/games`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${variables.tournamentId}/leaderboard`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      form.reset({
        tournamentId: variables.tournamentId,
        date: new Date().toISOString().split('T')[0],
        player1Id: "",
        player2Id: "",
        player1Score: "",
        player2Score: "",
        winnerId: "",
        notes: "",
      });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const filteredPlayers = (players as any[] || []).filter((player: any) =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const player1Id = form.watch("player1Id");
  const player2Id = form.watch("player2Id");

  // Filter out selected players from each other's dropdown
  const availableForPlayer1 = filteredPlayers.filter((p: any) => p.id.toString() !== player2Id);
  const availableForPlayer2 = filteredPlayers.filter((p: any) => p.id.toString() !== player1Id);

  function onSubmit(data: z.infer<typeof quickGameSchema>) {
    // Additional client-side validation
    if (data.player1Id === data.player2Id) {
      form.setError("player2Id", {
        type: "manual",
        message: "A player cannot compete against themselves"
      });
      return;
    }

    if (!data.winnerId || (data.winnerId !== data.player1Id && data.winnerId !== data.player2Id)) {
      form.setError("winnerId", {
        type: "manual",
        message: "Winner must be one of the selected players"
      });
      return;
    }

    recordGameMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto text-sm">
          <Plus className="mr-2 h-4 w-4" />
          Quick Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Quick Game Record</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tournamentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Tournament</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select tournament" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(tournaments as any[] || []).map((tournament: any) => (
                        <SelectItem key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="player1Id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Player 1</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select player 1" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        <div className="sticky top-0 bg-background border-b p-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search players..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8 text-sm"
                              onFocus={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-[120px]">
                          {availableForPlayer1.length > 0 ? availableForPlayer1.map((player: any) => (
                            <SelectItem key={player.id} value={player.id.toString()}>
                              {player.name}
                            </SelectItem>
                          )) : (
                            <div className="p-2 text-sm text-muted-foreground">No players found</div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="player2Id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Player 2</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select player 2" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        <div className="sticky top-0 bg-background border-b p-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search players..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8 text-sm"
                              onFocus={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-[120px]">
                          {availableForPlayer2.length > 0 ? availableForPlayer2.map((player: any) => (
                            <SelectItem key={player.id} value={player.id.toString()}>
                              {player.name}
                            </SelectItem>
                          )) : (
                            <div className="p-2 text-sm text-muted-foreground">No players found</div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="player1Score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Player 1 Score</FormLabel>
                    <FormControl>
                      <Input placeholder="Score" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="player2Score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Player 2 Score</FormLabel>
                    <FormControl>
                      <Input placeholder="Score" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="winnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Winner</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select winner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {player1Id && (
                        <SelectItem value={player1Id}>
                          {(players as any[] || []).find((p: any) => p.id.toString() === player1Id)?.name || "Player 1"}
                        </SelectItem>
                      )}
                      {player2Id && (
                        <SelectItem value={player2Id}>
                          {(players as any[] || []).find((p: any) => p.id.toString() === player2Id)?.name || "Player 2"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Game notes..." {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordGameMutation.isPending}
                className="w-full sm:w-auto text-sm"
              >
                {recordGameMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Game"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}