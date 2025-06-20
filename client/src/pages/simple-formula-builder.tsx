import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Save, Trophy, Users, Minus } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tournament } from "@shared/schema";

// Simplified schema for Win/Loss/Draw formula
const customRuleSchema = z.object({
  id: z.string(),
  condition: z.object({
    type: z.enum(["score_differential", "winner_score", "loser_score", "total_score"]),
    operator: z.enum(["equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between"]),
    value: z.union([z.number(), z.array(z.number())]),
  }),
  winnerPoints: z.number(),
  loserPoints: z.number(),
  description: z.string().optional(),
});

const simpleFormulaSchema = z.object({
  name: z.string().min(1, "Formula name is required"),
  description: z.string().optional(),
  tournamentId: z.string(), // Updated to handle UUID strings
  
  // Simple Win/Loss/Draw points
  winPoints: z.number().min(0).default(3),
  winPointsTeam: z.number().min(0).default(3),
  lossPoints: z.number().min(0).default(0),
  lossPointsTeam: z.number().min(0).default(0),
  drawPoints: z.number().min(0).default(1),
  drawPointsTeam: z.number().min(0).default(1),
  
  // Optional custom rules for advanced scenarios
  customRules: z.array(customRuleSchema).default([]),
});

type SimpleFormulaData = z.infer<typeof simpleFormulaSchema>;

export default function SimpleFormulaBuilder() {
  const { toast } = useToast();
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [editingFormula, setEditingFormula] = useState<any>(null);

  // Fetch user's tournaments only
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/my-tournaments"],
  });

  // Debug logging for tournament data
  console.log('🔄 Simple Formula Builder tournaments:', tournaments.length, tournaments.map(t => t.name));

  // Fetch existing formulas for the selected tournament
  const { data: existingFormulas = [], isLoading: formulasLoading } = useQuery<any[]>({
    queryKey: [`/api/tournaments/${selectedTournament}/formulas`],
    enabled: !!selectedTournament,
  });

  // Debug logs - force refresh every time tournament changes
  React.useEffect(() => {
    if (selectedTournament) {
      console.log("🔄 Tournament selected:", selectedTournament);
      console.log("📊 Formulas data:", existingFormulas);
      console.log("⏳ Formulas loading:", formulasLoading);
    }
  }, [selectedTournament, existingFormulas, formulasLoading]);

  const form = useForm<SimpleFormulaData>({
    resolver: zodResolver(simpleFormulaSchema),
    defaultValues: {
      name: "",
      description: "",
      tournamentId: "",
      winPoints: 3,
      winPointsTeam: 3,
      lossPoints: 0,
      lossPointsTeam: 0,
      drawPoints: 1,
      drawPointsTeam: 1,
      customRules: [],
    },
  });

  // Reset form when tournament changes
  React.useEffect(() => {
    if (selectedTournament) {
      form.reset({
        name: "",
        description: "",
        tournamentId: selectedTournament,
        winPoints: 3,
        winPointsTeam: 3,
        lossPoints: 0,
        lossPointsTeam: 0,
        drawPoints: 1,
        drawPointsTeam: 1,
        customRules: [],
      });
    }
  }, [selectedTournament, form]);

  const { fields: customRuleFields, append: appendCustomRule, remove: removeCustomRule } = useFieldArray({
    control: form.control,
    name: "customRules",
  });

  // Create or update formula mutation
  const createFormulaMutation = useMutation({
    mutationFn: async (data: SimpleFormulaData) => {
      // Convert simple format to the complex format expected by the backend
      const complexRules = [
        {
          id: "win-rule",
          condition: { type: "winner_score", operator: "greater_than", value: 0 },
          winnerPoints: data.winPoints,
          loserPoints: data.lossPoints,
          description: `Win: ${data.winPoints} points to winner, ${data.lossPoints} points to loser`
        },
        // Add draw rule if draw points are different from loss points
        ...(data.drawPoints !== data.lossPoints ? [{
          id: "draw-rule", 
          condition: { type: "winner_score", operator: "equals", value: 0 },
          winnerPoints: data.drawPoints,
          loserPoints: data.drawPoints,
          description: `Draw: ${data.drawPoints} points to each team`
        }] : []),
        // Add custom rules
        ...data.customRules
      ];

      const formulaData = {
        name: data.name,
        tournamentId: data.tournamentId,
        formula: {
          name: data.name,
          description: data.description || `Win: ${data.winPoints}, Loss: ${data.lossPoints}, Draw: ${data.drawPoints}`,
          rules: complexRules,
          defaultWinnerPoints: data.winPoints,
          defaultLoserPoints: data.lossPoints,
        },
        isDefault: false
      };

      const endpoint = editingFormula 
        ? `/api/leaderboard-formulas/${editingFormula.id}`
        : "/api/leaderboard-formulas";
      const method = editingFormula ? "PATCH" : "POST";
      
      const res = await apiRequest(method, endpoint, formulaData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Formula created successfully!",
        description: "Your new scoring formula is ready to use.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${selectedTournament}/leaderboard-formulas`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create formula",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SimpleFormulaData) => {
    if (!selectedTournament) {
      toast({
        title: "Please select a tournament",
        variant: "destructive",
      });
      return;
    }
    
    data.tournamentId = selectedTournament;
    createFormulaMutation.mutate(data);
  };

  const addCustomRule = () => {
    appendCustomRule({
      id: `rule-${Date.now()}`,
      condition: {
        type: "score_differential",
        operator: "greater_than",
        value: 0,
      },
      winnerPoints: 1,
      loserPoints: 0,
      description: "",
    });
  };

  const generatePreview = () => {
    const values = form.getValues();
    const scenarios = [
      { type: "Win", winnerScore: 6, loserScore: 0, winnerPoints: values.winPoints, loserPoints: values.lossPoints },
      { type: "Win", winnerScore: 6, loserScore: 4, winnerPoints: values.winPoints, loserPoints: values.lossPoints },
      { type: "Draw", winnerScore: 6, loserScore: 6, winnerPoints: values.drawPoints, loserPoints: values.drawPoints },
    ];
    setPreviewData(scenarios);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <MobileNav />
        
        <main className="p-4 lg:p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Formula Builder</h1>
                <p className="text-gray-600">Create simple Win/Loss/Draw scoring formulas</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Select Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTournament || ""} onValueChange={setSelectedTournament}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tournament..." />
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

            {/* Existing Formulas Section */}
            {selectedTournament && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-700">Existing Formulas</CardTitle>
                  <CardDescription>Edit or manage existing formulas for this tournament</CardDescription>
                </CardHeader>
                <CardContent>
                  {formulasLoading ? (
                    <div className="text-center py-4">Loading formulas...</div>
                  ) : existingFormulas.length > 0 ? (
                    <div className="space-y-3">
                      {existingFormulas.map((formula: any) => (
                        <div key={formula.id} className="flex justify-between items-center p-4 border border-blue-200 rounded-lg bg-blue-50">
                          <div>
                            <h4 className="font-semibold text-blue-800">{formula.name}</h4>
                            <p className="text-sm text-blue-600">
                              {typeof formula.formula === 'string' 
                                ? JSON.parse(formula.formula).description 
                                : formula.formula.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-300 text-blue-700 hover:bg-blue-100"
                              onClick={() => {
                                setEditingFormula(formula);
                                const parsedFormula = typeof formula.formula === 'string' 
                                  ? JSON.parse(formula.formula) 
                                  : formula.formula;
                                
                                // Extract actual points from rules
                                const winRule = parsedFormula.rules?.find((r: any) => r.id === 'win-rule');
                                const drawRule = parsedFormula.rules?.find((r: any) => r.id === 'draw-rule');
                                
                                // Extract custom rules (excluding standard win/draw rules)
                                const customRules = parsedFormula.rules?.filter((r: any) => 
                                  r.id !== 'win-rule' && r.id !== 'draw-rule'
                                ).map((rule: any) => ({
                                  id: rule.id,
                                  condition: {
                                    type: rule.condition?.type || "winner_score",
                                    operator: rule.condition?.operator || "equals",
                                    value: rule.condition?.value || 0,
                                    secondValue: rule.condition?.secondValue || 0
                                  },
                                  winnerPoints: rule.winnerPoints || 0,
                                  loserPoints: rule.loserPoints || 0,
                                  description: rule.description || ""
                                })) || [];
                                
                                form.reset({
                                  name: formula.name,
                                  description: parsedFormula.description || "",
                                  winPoints: winRule?.winnerPoints || 3,
                                  lossPoints: winRule?.loserPoints || 0,
                                  drawPoints: drawRule?.winnerPoints || 1,
                                  tournamentId: selectedTournament,
                                  customRules: customRules
                                });
                                
                                // Scroll to the form
                                setTimeout(() => {
                                  document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No formulas found for this tournament. Create one below.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedTournament && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Formula Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formula Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Standard Dominology Scoring" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe how this formula works..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Win/Loss/Draw Points
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Set how many points players and teams get for wins, losses, and draws
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-green-600 flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            When a team WINS
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="winPoints"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Individual Points</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="winPointsTeam"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Team Points</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold text-red-600 flex items-center gap-2">
                            <Minus className="h-4 w-4" />
                            When a team LOSES
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="lossPoints"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Individual Points</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="lossPointsTeam"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Team Points</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          When the game is a DRAW
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="drawPoints"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Individual Points (each player)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="drawPointsTeam"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Team Points (each team)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {customRuleFields.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Custom Rules</CardTitle>
                        <p className="text-sm text-gray-600">
                          Advanced rules for specific scenarios
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {customRuleFields.map((field, index) => (
                          <div key={field.id} className="border rounded-lg p-4 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">Custom Rule {index + 1}</h4>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeCustomRule(index);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.condition.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Condition Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select condition type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="winner_score">Winner Score</SelectItem>
                                        <SelectItem value="score_differential">Score Difference</SelectItem>
                                        <SelectItem value="specific_score">Specific Score Range</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.condition.operator`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Operator</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select operator" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="equals">Equals</SelectItem>
                                        <SelectItem value="greater_than">Greater Than</SelectItem>
                                        <SelectItem value="less_than">Less Than</SelectItem>
                                        <SelectItem value="between">Between</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.condition.value`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Value</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} placeholder="Enter value" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.condition.secondValue`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Second Value (if between)</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} placeholder="Optional" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.winnerPoints`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Winner Points</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} placeholder="Points for winner" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.loserPoints`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Loser Points</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} placeholder="Points for loser" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="mt-4">
                              <FormField
                                control={form.control}
                                name={`customRules.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        placeholder="e.g., If winner scores 6 and loser 1-5, count as draw"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-4">
                    <Button type="submit" disabled={createFormulaMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingFormula 
                        ? (createFormulaMutation.isPending ? "Updating..." : "Update Formula")
                        : (createFormulaMutation.isPending ? "Creating..." : "Create Formula")
                      }
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={(e) => {
                        e.preventDefault();
                        addCustomRule();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Rule
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={(e) => {
                        e.preventDefault();
                        generatePreview();
                      }}
                    >
                      Preview Scoring
                    </Button>
                  </div>

                  {previewData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Scoring Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {previewData.map((scenario, index) => (
                            <div key={index} className="flex justify-between items-center p-2 border rounded">
                              <span>{scenario.type}: {scenario.winnerScore} - {scenario.loserScore}</span>
                              <span>Winner: {scenario.winnerPoints} pts, Loser: {scenario.loserPoints} pts</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </form>
              </Form>
            )}

            {selectedTournament && Array.isArray(existingFormulas) && existingFormulas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Existing Formulas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {existingFormulas.map((formula: any) => (
                      <div key={formula.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <h4 className="font-medium">{formula.name}</h4>
                          {formula.description && (
                            <p className="text-sm text-gray-600">{formula.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Parse the formula and populate the form for editing
                              const parsedFormula = typeof formula.formula === 'string' 
                                ? JSON.parse(formula.formula) 
                                : formula.formula;
                              
                              // Extract custom rules (everything that's not win-rule or draw-rule)
                              const customRules = parsedFormula.rules?.filter((r: any) => 
                                r.id !== 'win-rule' && r.id !== 'draw-rule'
                              ) || [];
                              
                              setEditingFormula(formula);
                              form.reset({
                                name: formula.name,
                                description: parsedFormula.description || "",
                                tournamentId: selectedTournament || "",
                                winPoints: parsedFormula.rules?.find((r: any) => r.id === 'win-rule')?.winnerPoints || 3,
                                winPointsTeam: parsedFormula.rules?.find((r: any) => r.id === 'win-rule')?.winnerPoints || 3,
                                lossPoints: parsedFormula.rules?.find((r: any) => r.id === 'win-rule')?.loserPoints || 0,
                                lossPointsTeam: parsedFormula.rules?.find((r: any) => r.id === 'win-rule')?.loserPoints || 0,
                                drawPoints: parsedFormula.rules?.find((r: any) => r.id === 'draw-rule')?.winnerPoints || 1,
                                drawPointsTeam: parsedFormula.rules?.find((r: any) => r.id === 'draw-rule')?.winnerPoints || 1,
                                customRules: customRules, // Load your saved custom rules!
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}