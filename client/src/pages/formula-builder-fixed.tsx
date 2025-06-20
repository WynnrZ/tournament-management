import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tournament } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";

const simpleFormulaSchema = z.object({
  name: z.string().min(1, "Formula name is required"),
  winPoints: z.number().min(0, "Must be 0 or positive"),
  lossPoints: z.number().min(0, "Must be 0 or positive"),
  drawPoints: z.number().min(0, "Must be 0 or positive"),
  tournamentId: z.string().min(1, "Tournament is required"),
});

type SimpleFormulaData = z.infer<typeof simpleFormulaSchema>;

export default function FormulaBuilderFixed() {
  const { toast } = useToast();
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [editingFormula, setEditingFormula] = useState<any>(null);

  // Fetch tournaments
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  // Fetch existing formulas for the selected tournament  
  const { data: existingFormulas = [], isLoading: formulasLoading } = useQuery<any[]>({
    queryKey: [`/api/tournaments/${selectedTournament}/formulas`],
    enabled: !!selectedTournament,
  });

  const form = useForm<SimpleFormulaData>({
    resolver: zodResolver(simpleFormulaSchema),
    defaultValues: {
      name: "",
      winPoints: 3,
      lossPoints: 0,
      drawPoints: 1,
      tournamentId: "",
    },
  });

  // Create formula mutation
  const createFormulaMutation = useMutation({
    mutationFn: async (data: SimpleFormulaData) => {
      const response = await apiRequest("POST", "/api/leaderboard-formulas", {
        name: data.name,
        tournamentId: data.tournamentId,
        formula: {
          name: data.name,
          description: `Win: ${data.winPoints}, Loss: ${data.lossPoints}, Draw: ${data.drawPoints}`,
          rules: [
            {
              id: "win-rule",
              condition: { type: "winner_score", operator: "greater_than", value: 0 },
              winnerPoints: data.winPoints,
              loserPoints: data.lossPoints,
              description: `Win: ${data.winPoints} points to winner, ${data.lossPoints} points to loser`
            },
            {
              id: "draw-rule", 
              condition: { type: "winner_score", operator: "equals", value: 0 },
              winnerPoints: data.drawPoints,
              loserPoints: data.drawPoints,
              description: `Draw: ${data.drawPoints} points to each player/team`
            }
          ],
          defaultWinnerPoints: data.winPoints,
          defaultLoserPoints: data.lossPoints
        },
        isDefault: false
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${selectedTournament}/formulas`] });
      form.reset();
      toast({
        title: "Success!",
        description: "Formula created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update formula mutation
  const updateFormulaMutation = useMutation({
    mutationFn: async (data: SimpleFormulaData & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/leaderboard-formulas/${data.id}`, {
        name: data.name,
        formula: {
          name: data.name,
          description: `Win: ${data.winPoints}, Loss: ${data.lossPoints}, Draw: ${data.drawPoints}`,
          rules: [
            {
              id: "win-rule",
              condition: { type: "winner_score", operator: "greater_than", value: 0 },
              winnerPoints: data.winPoints,
              loserPoints: data.lossPoints,
              description: `Win: ${data.winPoints} points to winner, ${data.lossPoints} points to loser`
            },
            {
              id: "draw-rule",
              condition: { type: "winner_score", operator: "equals", value: 0 },
              winnerPoints: data.drawPoints,
              loserPoints: data.drawPoints,
              description: `Draw: ${data.drawPoints} points to each player/team`
            }
          ],
          defaultWinnerPoints: data.winPoints,
          defaultLoserPoints: data.lossPoints
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${selectedTournament}/formulas`] });
      setEditingFormula(null);
      form.reset();
      toast({
        title: "Success!",
        description: "Formula updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete formula mutation
  const deleteFormulaMutation = useMutation({
    mutationFn: async (formulaId: string) => {
      await apiRequest("DELETE", `/api/leaderboard-formulas/${formulaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${selectedTournament}/formulas`] });
      toast({
        title: "Success!",
        description: "Formula deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SimpleFormulaData) => {
    if (editingFormula) {
      updateFormulaMutation.mutate({ ...data, id: editingFormula.id });
    } else {
      createFormulaMutation.mutate(data);
    }
  };

  const startEdit = (formula: any) => {
    setEditingFormula(formula);
    // Extract points from formula rules
    const winRule = formula.formula.rules.find((r: any) => r.id === 'win-rule');
    const drawRule = formula.formula.rules.find((r: any) => r.id === 'draw-rule');
    
    form.reset({
      name: formula.name,
      winPoints: winRule?.winnerPoints || 3,
      lossPoints: winRule?.loserPoints || 0,
      drawPoints: drawRule?.winnerPoints || 1,
      tournamentId: selectedTournament,
    });
  };

  const cancelEdit = () => {
    setEditingFormula(null);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64">
        <MobileNav />
        
        <main className="p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Formula Builder</h1>
                <p className="text-gray-600">Create and manage scoring formulas for tournaments</p>
              </div>
            </div>

            {/* Tournament Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Existing Formulas */}
            {selectedTournament && existingFormulas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Existing Formulas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {existingFormulas.map((formula) => (
                      <div key={formula.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{formula.name}</h3>
                          <p className="text-sm text-gray-600">{formula.formula.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(formula)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFormulaMutation.mutate(formula.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formula Builder Form */}
            {selectedTournament && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {editingFormula ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    {editingFormula ? "Edit Formula" : "Create New Formula"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Formula Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formula Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Standard Scoring" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Hidden tournament field */}
                      <FormField
                        control={form.control}
                        name="tournamentId"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} value={selectedTournament} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Points Configuration */}
                      <div className="grid md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="winPoints"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-green-600">Win Points</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lossPoints"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-red-600">Loss Points</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="drawPoints"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-blue-600">Draw Points</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          disabled={createFormulaMutation.isPending || updateFormulaMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {editingFormula ? "Update Formula" : "Create Formula"}
                        </Button>
                        {editingFormula && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}