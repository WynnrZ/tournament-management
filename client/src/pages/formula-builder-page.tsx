import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Save, Eye, FileText, Zap } from "lucide-react";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
import { nanoid } from "nanoid";
import { motion } from "framer-motion";

// Schema for formula rules
const formulaRuleSchema = z.object({
  id: z.string(),
  condition: z.object({
    type: z.enum(["score_differential", "winner_score", "loser_score", "total_score"]),
    operator: z.enum(["equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "between"]),
    value: z.union([z.number(), z.array(z.number())]),
  }),
  winnerPoints: z.number().min(0),
  loserPoints: z.number().min(0).default(0),
  description: z.string().optional(),
});

const formulaSchema = z.object({
  name: z.string().min(1, "Formula name is required"),
  description: z.string().optional(),
  tournamentId: z.string(),
  rules: z.array(formulaRuleSchema).min(1, "At least one rule is required"),
  defaultWinnerPoints: z.number().min(0).default(1),
  defaultLoserPoints: z.number().min(0).default(0),
});

type FormulaFormData = z.infer<typeof formulaSchema>;
type FormulaRule = z.infer<typeof formulaRuleSchema>;

// Formula templates with explanations
const FORMULA_TEMPLATES = [
  {
    id: "basic-win-loss",
    name: "Basic Win/Loss",
    description: "Simple 1 point for win, 0 for loss",
    explanation: "Traditional scoring where winners get 1 point and losers get 0 points. Most common in tournament play.",
    formula: {
      name: "Basic Win/Loss",
      description: "Win: 1 point, Loss: 0 points",
      defaultWinnerPoints: 1,
      defaultLoserPoints: 0,
      rules: [
        {
          id: "win-rule",
          condition: { type: "winner_score", operator: "greater_than", value: 0 },
          winnerPoints: 1,
          loserPoints: 0,
          description: "Win: 1 point to winner, 0 points to loser"
        }
      ]
    }
  },
  {
    id: "three-point-system",
    name: "Three Point System",
    description: "3 points for win, 1 for draw, 0 for loss",
    explanation: "Popular in sports leagues. Encourages winning over drawing by giving more points for wins.",
    formula: {
      name: "Three Point System",
      description: "Win: 3, Draw: 1, Loss: 0",
      defaultWinnerPoints: 3,
      defaultLoserPoints: 0,
      rules: [
        {
          id: "win-rule",
          condition: { type: "winner_score", operator: "greater_than", value: 0 },
          winnerPoints: 3,
          loserPoints: 0,
          description: "Win: 3 points to winner, 0 points to loser"
        },
        {
          id: "draw-rule",
          condition: { type: "winner_score", operator: "equals", value: 0 },
          winnerPoints: 1,
          loserPoints: 1,
          description: "Draw: 1 point to each player"
        }
      ]
    }
  },
  {
    id: "high-scoring-bonus",
    name: "High Scoring Bonus",
    description: "Extra points for dominant victories",
    explanation: "Rewards players who achieve decisive wins. Perfect for games where score margins matter.",
    formula: {
      name: "High Scoring Bonus",
      description: "Win: 3, Perfect Game: 5, Loss: 0",
      defaultWinnerPoints: 3,
      defaultLoserPoints: 0,
      rules: [
        {
          id: "win-rule",
          condition: { type: "winner_score", operator: "greater_than", value: 0 },
          winnerPoints: 3,
          loserPoints: 0,
          description: "Win: 3 points to winner, 0 points to loser"
        },
        {
          id: "perfect-game",
          condition: { type: "winner_score", operator: "equals", value: 12 },
          winnerPoints: 5,
          loserPoints: 0,
          description: "Perfect game (12-0): 5 points to winner"
        }
      ]
    }
  },
  {
    id: "margin-based",
    name: "Margin-Based Scoring",
    description: "Points based on victory margin",
    explanation: "Score differential determines points. Closer games give fewer points, blowouts give more.",
    formula: {
      name: "Margin-Based Scoring",
      description: "Points based on victory margin",
      defaultWinnerPoints: 2,
      defaultLoserPoints: 0,
      rules: [
        {
          id: "close-win",
          condition: { type: "score_differential", operator: "between", value: [1, 3] },
          winnerPoints: 2,
          loserPoints: 1,
          description: "Close win (1-3 point margin): 2 points to winner, 1 to loser"
        },
        {
          id: "comfortable-win",
          condition: { type: "score_differential", operator: "between", value: [4, 7] },
          winnerPoints: 3,
          loserPoints: 0,
          description: "Comfortable win (4-7 point margin): 3 points to winner"
        },
        {
          id: "dominant-win",
          condition: { type: "score_differential", operator: "greater_than", value: 7 },
          winnerPoints: 4,
          loserPoints: 0,
          description: "Dominant win (8+ point margin): 4 points to winner"
        }
      ]
    }
  },
  {
    id: "performance-weighted",
    name: "Performance Weighted",
    description: "Bonus points for exceptional scores",
    explanation: "Base points for winning plus bonuses for achieving high scores. Rewards skill and consistency.",
    formula: {
      name: "Performance Weighted",
      description: "Base win + performance bonuses",
      defaultWinnerPoints: 2,
      defaultLoserPoints: 0,
      rules: [
        {
          id: "standard-win",
          condition: { type: "winner_score", operator: "between", value: [6, 8] },
          winnerPoints: 2,
          loserPoints: 0,
          description: "Standard win (6-8 points): 2 points"
        },
        {
          id: "good-performance",
          condition: { type: "winner_score", operator: "between", value: [9, 11] },
          winnerPoints: 3,
          loserPoints: 0,
          description: "Good performance (9-11 points): 3 points"
        },
        {
          id: "excellent-performance",
          condition: { type: "winner_score", operator: "equals", value: 12 },
          winnerPoints: 4,
          loserPoints: 0,
          description: "Excellent performance (12 points): 4 points"
        }
      ]
    }
  },
  {
    id: "progressive-scoring",
    name: "Progressive Scoring",
    description: "Increasing rewards for higher scores",
    explanation: "Each point level gives progressively more tournament points. Motivates players to maximize their performance.",
    formula: {
      name: "Progressive Scoring",
      description: "Higher scores = exponentially more points",
      defaultWinnerPoints: 1,
      defaultLoserPoints: 0,
      rules: [
        {
          id: "score-6-7",
          condition: { type: "winner_score", operator: "between", value: [6, 7] },
          winnerPoints: 1,
          loserPoints: 0,
          description: "Score 6-7: 1 point"
        },
        {
          id: "score-8-9",
          condition: { type: "winner_score", operator: "between", value: [8, 9] },
          winnerPoints: 2,
          loserPoints: 0,
          description: "Score 8-9: 2 points"
        },
        {
          id: "score-10-11",
          condition: { type: "winner_score", operator: "between", value: [10, 11] },
          winnerPoints: 3,
          loserPoints: 0,
          description: "Score 10-11: 3 points"
        },
        {
          id: "score-12",
          condition: { type: "winner_score", operator: "equals", value: 12 },
          winnerPoints: 5,
          loserPoints: 0,
          description: "Perfect score 12: 5 points"
        }
      ]
    }
  }
];

export default function FormulaBuilderPage() {
  console.log('🚀 FormulaBuilderPage rendering');
  const { toast } = useToast();
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [previewExample, setPreviewExample] = useState({ winnerScore: 6, loserScore: 0 });
  const [editingFormula, setEditingFormula] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Debug logging
  console.log('🎯 Debug state:', {
    selectedTournament,
    showTemplates,
    templatesLength: FORMULA_TEMPLATES.length,
    shouldShowTemplates: selectedTournament && showTemplates
  });

  // Fetch user's tournaments only - force fresh data every time
  const { data: tournaments = [], refetch: refetchTournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/my-tournaments"],
    staleTime: 0, // Always refetch to avoid caching issues
    gcTime: 0, // Don't cache this query (updated from cacheTime)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Force refresh every 5 seconds to clear any caching issues
  });

  // Force immediate cache invalidation and refetch
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/my-tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    refetchTournaments();
  }, [refetchTournaments]);

  // Debug logging for tournaments
  console.log('🔄 Formula Builder tournaments:', tournaments.length, tournaments.map(t => t.name));

  // Fetch existing formulas for selected tournament
  const { data: existingFormulas = [] } = useQuery({
    queryKey: ["/api/tournaments", selectedTournament, "formulas"],
    queryFn: async () => {
      if (!selectedTournament) return [];
      const response = await fetch(`/api/tournaments/${selectedTournament}/formulas`);
      if (!response.ok) throw new Error('Failed to fetch formulas');
      return response.json();
    },
    enabled: !!selectedTournament,
  });

  const form = useForm<FormulaFormData>({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      name: "",
      description: "",
      tournamentId: "",
      rules: [],
      defaultWinnerPoints: 1,
      defaultLoserPoints: 0,
    },
  });

  const { fields: rules, append: addRule, remove: removeRule, replace: replaceRules } = useFieldArray({
    control: form.control,
    name: "rules",
  });

  // Function to apply a template to the form
  const applyTemplate = (templateId: string) => {
    const template = FORMULA_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    form.setValue("name", template.formula.name);
    form.setValue("description", template.formula.description);
    form.setValue("defaultWinnerPoints", template.formula.defaultWinnerPoints);
    form.setValue("defaultLoserPoints", template.formula.defaultLoserPoints);
    
    // Replace all rules with template rules, ensuring proper typing
    replaceRules(template.formula.rules.map(rule => ({
      ...rule,
      id: nanoid(), // Generate new IDs for form
      condition: {
        ...rule.condition,
        type: rule.condition.type as "score_differential" | "winner_score" | "loser_score" | "total_score",
        operator: rule.condition.operator as "equals" | "greater_than" | "less_than" | "greater_than_or_equal" | "less_than_or_equal" | "between"
      }
    })));

    setSelectedTemplate(templateId);
    setShowTemplates(false);
    
    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied to the formula.`,
    });
  };

  // Create formula mutation
  const createFormulaMutation = useMutation({
    mutationFn: async (data: FormulaFormData) => {
      const response = await apiRequest("POST", "/api/leaderboard-formulas", {
        ...data,
        formula: {
          name: data.name,
          description: data.description,
          rules: data.rules,
          defaultWinnerPoints: data.defaultWinnerPoints,
          defaultLoserPoints: data.defaultLoserPoints,
        }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Formula created successfully!",
      });
      // Invalidate the correct query key to refresh the formulas list
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", selectedTournament, "formulas"] });
      form.reset({
        name: "",
        description: "",
        tournamentId: selectedTournament || 0,
        rules: [],
        defaultWinnerPoints: 1,
        defaultLoserPoints: 0,
      });
      setShowTemplates(false); // Hide templates after successful creation
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create formula",
        variant: "destructive",
      });
    },
  });

  // Update formula mutation
  const updateFormulaMutation = useMutation({
    mutationFn: async (data: FormulaFormData & { id: number }) => {
      try {
        const response = await apiRequest("PATCH", `/api/leaderboard-formulas/${data.id}`, {
          name: data.name,
          description: data.description,
          tournamentId: data.tournamentId,
          formula: {
            rules: data.rules,
            defaultWinnerPoints: data.defaultWinnerPoints,
            defaultLoserPoints: data.defaultLoserPoints,
          }
        });
        
        // Check if response is ok first
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${errorText}`);
        }
        
        // Try to parse JSON response
        const responseText = await response.text();
        if (!responseText.trim()) {
          // Empty response is fine, formula was updated
          return { success: true };
        }
        
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.log('✅ Formula updated successfully (non-JSON response)');
          return { success: true };
        }
      } catch (error) {
        console.error('❌ Update formula error:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      // Clear all caches immediately including leaderboards
      queryClient.removeQueries({ queryKey: ["/api/tournaments", selectedTournament, "formulas"] });
      queryClient.removeQueries({ queryKey: ["/api/leaderboard-formulas"] });
      queryClient.removeQueries({ queryKey: ["/api/tournaments", selectedTournament, "player-leaderboard"] });
      queryClient.removeQueries({ queryKey: ["/api/tournaments", selectedTournament, "team-leaderboard"] });
      
      // Clear any leaderboard queries with formula IDs
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key.includes("player-leaderboard") || 
            key.includes("team-leaderboard")
          );
        }
      });
      
      // Force fresh fetch of formulas and leaderboards
      await queryClient.refetchQueries({ queryKey: ["/api/tournaments", selectedTournament, "formulas"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tournaments", selectedTournament, "player-leaderboard"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tournaments", selectedTournament, "team-leaderboard"] });
      
      toast({
        title: "Success", 
        description: "Formula updated! Leaderboard will refresh automatically.",
      });
      
      setEditingFormula(null);
      form.reset({
        name: "",
        description: "",
        tournamentId: selectedTournament || 0,
        rules: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update formula",
        variant: "destructive",
      });
    },
  });

  // Load formula for editing
  const loadFormulaForEdit = (formula: any) => {
    console.log('🔧 Loading formula for edit:', formula);
    setEditingFormula(formula);
    
    // Safely parse the formula data
    let parsedFormula = {};
    try {
      if (typeof formula.formula === 'string') {
        parsedFormula = JSON.parse(formula.formula);
      } else if (formula.formula && typeof formula.formula === 'object') {
        parsedFormula = formula.formula;
      }
    } catch (error) {
      console.error('Error parsing formula:', error);
      parsedFormula = {};
    }
    
    console.log('🔧 Parsed formula:', parsedFormula);
    
    // Ensure rules array exists and has valid structure with proper type conversion
    const rules = Array.isArray((parsedFormula as any).rules) ? (parsedFormula as any).rules.map((rule: any) => ({
      id: rule.id || nanoid(),
      condition: {
        type: rule.condition?.type || "score_differential",
        operator: rule.condition?.operator || "equals",
        value: Array.isArray(rule.condition?.value) 
          ? rule.condition.value.map((v: any) => Number(v) || 0)
          : (Number(rule.condition?.value) || 0),
      },
      winnerPoints: Number(rule.winnerPoints) || 0,
      loserPoints: Number(rule.loserPoints) || 0,
      description: String(rule.description || ""),
    })) : [];
    
    console.log('🔧 Rules to load:', rules);
    
    const formData = {
      name: formula.name || "",
      description: formula.description || "",
      tournamentId: formula.tournamentId,
      rules: rules,
      defaultWinnerPoints: (parsedFormula as any).defaultWinnerPoints || 1,
      defaultLoserPoints: (parsedFormula as any).defaultLoserPoints || 0,
    };
    
    console.log('🔧 Form data to set:', formData);
    
    form.reset(formData);
    setSelectedTournament(formula.tournamentId);
    
    // Scroll to the form section
    setTimeout(() => {
      const formSection = document.querySelector('[data-form-section]');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const addNewRule = () => {
    addRule({
      id: nanoid(),
      condition: {
        type: "score_differential",
        operator: "equals",
        value: 0,
      },
      winnerPoints: 1,
      loserPoints: 0,
      description: "",
    });
  };

  const calculatePreviewPoints = (winnerScore: number, loserScore: number, rules: FormulaRule[], defaultWinnerPoints: number, defaultLoserPoints: number) => {
    for (const rule of rules) {
      const { condition } = rule;
      let conditionValue: number;

      switch (condition.type) {
        case "score_differential":
          conditionValue = winnerScore - loserScore;
          break;
        case "winner_score":
          conditionValue = winnerScore;
          break;
        case "loser_score":
          conditionValue = loserScore;
          break;
        case "total_score":
          conditionValue = winnerScore + loserScore;
          break;
        default:
          continue;
      }

      let matches = false;
      if (Array.isArray(condition.value)) {
        // Between operator
        matches = condition.operator === "between" && 
                 conditionValue >= condition.value[0] && 
                 conditionValue <= condition.value[1];
      } else {
        switch (condition.operator) {
          case "equals":
            matches = conditionValue === condition.value;
            break;
          case "greater_than":
            matches = conditionValue > condition.value;
            break;
          case "less_than":
            matches = conditionValue < condition.value;
            break;
          case "greater_than_or_equal":
            matches = conditionValue >= condition.value;
            break;
          case "less_than_or_equal":
            matches = conditionValue <= condition.value;
            break;
        }
      }

      if (matches) {
        return { winner: rule.winnerPoints, loser: rule.loserPoints };
      }
    }

    return { winner: defaultWinnerPoints, loser: defaultLoserPoints };
  };

  const onSubmit = (data: FormulaFormData) => {
    if (!selectedTournament) {
      toast({
        title: "Error",
        description: "Please select a tournament",
        variant: "destructive",
      });
      return;
    }

    if (editingFormula) {
      updateFormulaMutation.mutate({
        ...data,
        id: editingFormula.id,
        tournamentId: selectedTournament,
      });
    } else {
      createFormulaMutation.mutate({
        ...data,
        tournamentId: selectedTournament,
      });
    }
  };

  const currentRules = form.watch("rules");
  const defaultWinnerPoints = form.watch("defaultWinnerPoints");
  const defaultLoserPoints = form.watch("defaultLoserPoints");
  const previewPoints = calculatePreviewPoints(
    previewExample.winnerScore, 
    previewExample.loserScore, 
    currentRules, 
    defaultWinnerPoints, 
    defaultLoserPoints
  );

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
                  Formula Builder
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Create custom scoring formulas for tournament leaderboards and competitive gameplay.
                </p>
              </motion.div>
            </div>

            {/* Tournament Selection */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="backdrop-blur-xl bg-white/70 border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="w-full sm:w-64">
                      <Label className="text-sm font-medium text-slate-700 mb-1">
                        Select Tournament
                      </Label>
                      <Select 
                        value={selectedTournament?.toString() || ""} 
                        onValueChange={(value) => {
                          setSelectedTournament(value);
                          form.setValue("tournamentId", value);
                          
                          // Show templates when selecting a new tournament
                          setShowTemplates(true);
                          setEditingFormula(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tournament" />
                        </SelectTrigger>
                        <SelectContent>
                          {tournaments.map((tournament) => (
                            <SelectItem key={tournament.id} value={tournament.id.toString()}>
                              {tournament.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Template Selection - Always show when tournament selected */}
            {selectedTournament && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="backdrop-blur-xl bg-white/70 border-white/20 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Choose Formula Template
                      </CardTitle>
                      <p className="text-sm text-slate-600">
                        Select a pre-built template or create a custom formula from scratch
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {FORMULA_TEMPLATES.map((template) => (
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * FORMULA_TEMPLATES.indexOf(template) }}
                            className="group"
                          >
                            <Card 
                              className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 border-gray-200 hover:border-blue-300"
                              onClick={() => {
                                applyTemplate(template.id);
                                setSelectedTemplate(template.id);
                                setShowTemplates(false); // Hide templates to show the editable form
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0">
                                    <Zap className="h-5 w-5 text-blue-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {template.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {template.description}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {template.explanation}
                                    </p>
                                    <div className="mt-3">
                                      <Badge variant="secondary" className="text-xs">
                                        {template.formula.rules.length} rules
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                        
                        {/* Custom Formula Option */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 * FORMULA_TEMPLATES.length }}
                          className="group"
                        >
                          <Card 
                            className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 border-dashed border-gray-300 hover:border-purple-400"
                            onClick={() => {
                              setShowTemplates(false);
                              setSelectedTemplate(null);
                              form.reset({
                                name: "",
                                description: "",
                                tournamentId: selectedTournament,
                                rules: [],
                                defaultWinnerPoints: 1,
                                defaultLoserPoints: 0,
                              });
                            }}
                          >
                            <CardContent className="p-4 h-full flex items-center justify-center">
                              <div className="text-center">
                                <Plus className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                  Custom Formula
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Build your own scoring system
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Create completely custom rules and point distributions
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowTemplates(false);
                            setSelectedTemplate(null);
                          }}
                          className="w-full sm:w-auto"
                        >
                          Skip Templates - Create Custom Formula
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Existing Formulas and Create Button */}
            {selectedTournament && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Formula Management</h2>
                    <p className="text-sm text-gray-600 mt-1">Create new formulas or edit existing ones for this tournament</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTemplates(true);
                        setSelectedTemplate(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Use Template
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingFormula(null);
                        form.reset({
                          name: "",
                          description: "",
                          tournamentId: selectedTournament,
                          rules: [],
                          defaultWinnerPoints: 1,
                          defaultLoserPoints: 0,
                        });
                        setTimeout(() => {
                          const formSection = document.querySelector('[data-form-section]');
                          if (formSection) {
                            formSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Formula
                    </Button>
                  </div>
                </div>

                {existingFormulas.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Existing Formulas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(existingFormulas as any[]).map((formula: any) => (
                          <div key={formula.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{formula.name}</h3>
                              {formula.description && (
                                <p className="text-sm text-gray-500 mt-1">{formula.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {typeof formula.formula === 'string' 
                                    ? JSON.parse(formula.formula).rules?.length || 0 
                                    : formula.formula?.rules?.length || 0} rules
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  Created {new Date(formula.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadFormulaForEdit(formula)}
                              className="ml-4"
                            >
                              Edit Formula
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Formula Builder */}
            {selectedTournament && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6" data-form-section>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Formula Configuration */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg font-medium flex items-center gap-2">
                            Formula Configuration
                            {selectedTemplate && (
                              <Badge variant="secondary" className="text-xs">
                                Using {FORMULA_TEMPLATES.find(t => t.id === selectedTemplate)?.name} Template
                              </Badge>
                            )}
                            {editingFormula && (
                              <Badge variant="outline" className="text-xs">
                                Editing Formula
                              </Badge>
                            )}
                          </CardTitle>
                          {selectedTemplate && (
                            <p className="text-sm text-gray-600">
                              Template applied - you can modify any values before saving
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Formula Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Standard Tournament Scoring" {...field} />
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

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="defaultWinnerPoints"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Default Winner Points</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      {...field} 
                                      onChange={(e) => field.onChange(Number(e.target.value))} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="defaultLoserPoints"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Default Loser Points</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      {...field} 
                                      onChange={(e) => field.onChange(Number(e.target.value))} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Preview */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Preview
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Winner Score</Label>
                              <Input 
                                type="number" 
                                min="0" 
                                value={previewExample.winnerScore} 
                                onChange={(e) => setPreviewExample(prev => ({ ...prev, winnerScore: Number(e.target.value) }))}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Loser Score</Label>
                              <Input 
                                type="number" 
                                min="0" 
                                value={previewExample.loserScore} 
                                onChange={(e) => setPreviewExample(prev => ({ ...prev, loserScore: Number(e.target.value) }))}
                              />
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-md">
                            <h4 className="font-medium mb-2">Result with current formula:</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Winner gets:</span>
                                <Badge variant="default">{previewPoints.winner} points</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Loser gets:</span>
                                <Badge variant="secondary">{previewPoints.loser} points</Badge>
                              </div>
                              <div className="text-xs text-gray-500">
                                Score differential: {previewExample.winnerScore - previewExample.loserScore}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Scoring Rules */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-medium">Scoring Rules</CardTitle>
                          <Button type="button" onClick={addNewRule} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Rule
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Rules are evaluated in order. The first matching rule determines the points awarded.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {rules.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No rules defined yet. Click "Add Rule" to get started.</p>
                          </div>
                        ) : (
                          rules.map((rule, index) => (
                            <RuleBuilder
                              key={rule.id}
                              index={index}
                              form={form}
                              onRemove={() => removeRule(index)}
                            />
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                      <div className="flex items-center gap-3">
                        {editingFormula && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setEditingFormula(null);
                              form.reset();
                            }}
                          >
                            Cancel Edit
                          </Button>
                        )}
                        <Button 
                          type="submit" 
                          disabled={createFormulaMutation.isPending || updateFormulaMutation.isPending}
                          className="min-w-32"
                        >
                          {(createFormulaMutation.isPending || updateFormulaMutation.isPending) ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              {editingFormula ? "Updating..." : "Saving..."}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Save className="h-4 w-4" />
                              {editingFormula ? "Update Formula" : "Save Formula"}
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </motion.div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}

interface RuleBuilderProps {
  index: number;
  form: any;
  onRemove: () => void;
}

function RuleBuilder({ index, form, onRemove }: RuleBuilderProps) {
  const conditionType = form.watch(`rules.${index}.condition.type`);
  const operator = form.watch(`rules.${index}.condition.operator`);

  const getConditionTypeLabel = (type: string) => {
    switch (type) {
      case "score_differential": return "Score Difference";
      case "winner_score": return "Winner's Score";
      case "loser_score": return "Loser's Score";
      case "total_score": return "Total Score";
      default: return type;
    }
  };

  const getOperatorLabel = (op: string) => {
    switch (op) {
      case "equals": return "equals";
      case "greater_than": return "greater than";
      case "less_than": return "less than";
      case "greater_than_or_equal": return "greater than or equal to";
      case "less_than_or_equal": return "less than or equal to";
      case "between": return "between";
      default: return op;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Rule #{index + 1}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name={`rules.${index}.condition.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>When</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="score_differential">Score Difference</SelectItem>
                  <SelectItem value="winner_score">Winner's Score</SelectItem>
                  <SelectItem value="loser_score">Loser's Score</SelectItem>
                  <SelectItem value="total_score">Total Score</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`rules.${index}.condition.operator`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Is</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="equals">equals</SelectItem>
                  <SelectItem value="greater_than">greater than</SelectItem>
                  <SelectItem value="less_than">less than</SelectItem>
                  <SelectItem value="greater_than_or_equal">≥ (greater or equal)</SelectItem>
                  <SelectItem value="less_than_or_equal">≤ (less or equal)</SelectItem>
                  <SelectItem value="between">between</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {operator === "between" ? (
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name={`rules.${index}.condition.value.0`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => {
                        const currentValue = form.getValues(`rules.${index}.condition.value`) || [0, 0];
                        form.setValue(`rules.${index}.condition.value`, [Number(e.target.value), currentValue[1] || 0]);
                      }} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`rules.${index}.condition.value.1`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => {
                        const currentValue = form.getValues(`rules.${index}.condition.value`) || [0, 0];
                        form.setValue(`rules.${index}.condition.value`, [currentValue[0] || 0, Number(e.target.value)]);
                      }} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <FormField
            control={form.control}
            name={`rules.${index}.condition.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={(e) => field.onChange(Number(e.target.value))} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`rules.${index}.winnerPoints`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Winner Gets (points)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`rules.${index}.loserPoints`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loser Gets (points)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={`rules.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Shutout victory bonus" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}