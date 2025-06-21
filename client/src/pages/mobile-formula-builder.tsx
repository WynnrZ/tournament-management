import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Trophy } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Tournament } from "@shared/schema";

const simpleFormulaSchema = z.object({
  name: z.string().min(1, "Formula name is required"),
  description: z.string().optional(),
  tournamentId: z.string().min(1, "Tournament is required"),
  winPoints: z.number().min(0).default(3),
  lossPoints: z.number().min(0).default(0),
  drawPoints: z.number().min(0).default(1),
});

type SimpleFormulaData = z.infer<typeof simpleFormulaSchema>;

export default function MobileFormulaBuilder() {
  const { toast } = useToast();
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  
  // Fetch user's tournaments only
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/my-tournaments"],
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    winPoints: 3,
    lossPoints: 0,
    drawPoints: 1,
  });

  // Create formula mutation
  const createFormulaMutation = useMutation({
    mutationFn: async (data: SimpleFormulaData) => {
      const complexRules = [
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
      ];

      const complexFormula = {
        name: data.name,
        description: data.description || `Win: ${data.winPoints}, Loss: ${data.lossPoints}, Draw: ${data.drawPoints}`,
        tournamentId: data.tournamentId, // Keep as string for UUID
        formula: {
          name: data.name,
          description: data.description || `Win: ${data.winPoints}, Loss: ${data.lossPoints}, Draw: ${data.drawPoints}`,
          rules: complexRules
        }
      };

      const response = await fetch("/api/leaderboard-formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complexFormula),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create formula");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Formula created successfully!",
        description: "Your new scoring formula is ready to use.",
      });
      setFormData({
        name: "",
        description: "",
        winPoints: 3,
        lossPoints: 0,
        drawPoints: 1,
      });
      setSelectedTournament("");
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

  const handleSubmit = () => {
    if (!selectedTournament) {
      toast({
        title: "Please select a tournament",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.name.trim()) {
      toast({
        title: "Please enter a formula name",
        variant: "destructive",
      });
      return;
    }

    const submitData: SimpleFormulaData = {
      ...formData,
      tournamentId: selectedTournament,
    };
    
    createFormulaMutation.mutate(submitData);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Formula Builder</h1>
                <p className="text-gray-600 text-sm">Create simple scoring formulas</p>
              </div>
            </div>

            {/* Tournament Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Tournament</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
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

            {selectedTournament && (
              <>
                {/* Formula Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Formula Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Formula Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Standard Scoring"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe how this formula works..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Points Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Point Values</CardTitle>
                    <p className="text-sm text-gray-600">Set points for each game outcome</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="winPoints">Win Points</Label>
                        <Input
                          id="winPoints"
                          type="number"
                          value={formData.winPoints}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            winPoints: parseInt(e.target.value) || 0 
                          }))}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lossPoints">Loss Points</Label>
                        <Input
                          id="lossPoints"
                          type="number"
                          value={formData.lossPoints}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            lossPoints: parseInt(e.target.value) || 0 
                          }))}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <Label htmlFor="drawPoints">Draw Points</Label>
                        <Input
                          id="drawPoints"
                          type="number"
                          value={formData.drawPoints}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            drawPoints: parseInt(e.target.value) || 0 
                          }))}
                          className="text-center"
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <h4 className="font-medium text-blue-800 mb-2">Preview</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div>• Win a game: {formData.winPoints} points</div>
                        <div>• Lose a game: {formData.lossPoints} points</div>
                        <div>• Draw a game: {formData.drawPoints} points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Rules Option */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Advanced Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="customRules"
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Redirect to full formula builder for custom rules
                              window.location.href = `/formula-builder?tournament=${selectedTournament}`;
                            }
                          }}
                        />
                        <label htmlFor="customRules" className="text-sm font-medium">
                          Need custom rules? (Advanced Formula Builder)
                        </label>
                      </div>
                      <p className="text-xs text-gray-600">
                        Check this to access advanced conditions like score ranges, differential rules, and more complex scoring logic.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Card>
                  <CardContent className="pt-6">
                    <Button 
                      onClick={handleSubmit}
                      disabled={createFormulaMutation.isPending || !formData.name.trim()}
                      className="w-full"
                      size="lg"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {createFormulaMutation.isPending ? "Creating..." : "Create Formula"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}