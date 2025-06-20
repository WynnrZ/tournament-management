import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import TournamentCard from "@/components/tournaments/tournament-card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTournamentSchema, Tournament } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Plus, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

// Define a simple schema for the form
const createTournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  description: z.string().optional(),
  gameType: z.string().min(1, "Game type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function TournamentsPage() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "active" | "ended">("all");
  const { user } = useAuth();

  const isAdmin = (user as any)?.is_admin === true;
  const isAppAdmin = (user as any)?.is_app_admin === true;

  // Get user's tournaments (tournaments they created or participate in)
  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/my-tournaments"],
    enabled: !!user,
  });

  // Tournament creation form
  const form = useForm<z.infer<typeof createTournamentSchema>>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      gameType: "",
    },
  });

  // Create tournament mutation
  const createTournamentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createTournamentSchema>) => {
      try {
        // Simplified data handling - let the server handle the date conversion
        const formattedData = {
          name: data.name,
          description: data.description || null,
          gameType: data.gameType,
          isActive: data.isActive,
          startDate: data.startDate,
          endDate: data.endDate && data.endDate.trim() !== "" ? data.endDate : null,
          image: null
        };
        console.log("Sending tournament data:", formattedData);
        const res = await apiRequest("POST", "/api/tournaments", formattedData);
        return await res.json();
      } catch (error) {
        console.error("Error creating tournament:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Tournament created successfully!",
        description: data.message || `You are now the administrator of "${data.name}" with full management permissions.`,
        duration: 5000,
      });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: z.infer<typeof createTournamentSchema>) {
    createTournamentMutation.mutate(values);
  }

  // Filter tournaments
  const filteredTournaments = tournaments?.filter(tournament => {
    if (filter === "active") return tournament.isActive;
    if (filter === "ended") return !tournament.isActive;
    return true;
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
                  Tournaments
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Create tournaments and manage the players who will compete for ultimate bragging rights.
                </p>
              </motion.div>
              
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Tournament
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create a New Tournament</DialogTitle>
                        <DialogDescription>
                          Fill in the details below to create a new tournament.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tournament Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter tournament name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="gameType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Game Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Basketball, Chess, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Date (Optional)</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter tournament description" 
                                    {...field} 
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Active Tournament</FormLabel>
                                  <p className="text-sm text-gray-500">Mark this tournament as active</p>
                                </div>
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              disabled={createTournamentMutation.isPending}
                            >
                              {createTournamentMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create Tournament"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <Tabs defaultValue="all" onValueChange={(value) => setFilter(value as "all" | "active" | "ended")}>
                <TabsList>
                  <TabsTrigger value="all">All Tournaments</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="ended">Ended</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tournaments Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white shadow rounded-lg h-80 animate-pulse" />
                  ))}
                </div>
              ) : filteredTournaments?.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
                    <p className="text-gray-500 mb-4">
                      {filter === "all" 
                        ? "You haven't created any tournaments yet." 
                        : filter === "active" 
                          ? "You don't have any active tournaments." 
                          : "You don't have any ended tournaments."}
                    </p>
                    <Button onClick={() => setOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTournaments?.map((tournament) => (
                    <TournamentCard 
                      key={tournament.id} 
                      tournament={tournament} 
                      showDetailsLink={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
