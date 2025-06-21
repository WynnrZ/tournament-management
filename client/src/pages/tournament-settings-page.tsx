import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings, Calculator, Users, Calendar, Save, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useTournamentPermissions } from '@/hooks/use-tournament-permissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SidebarEnhanced from '@/components/layout/sidebar-enhanced';
import { Tournament, LeaderboardFormula } from '@shared/schema';

const tournamentSettingsSchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  description: z.string().optional(),
  gameType: z.string().min(1, 'Game type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isActive: z.boolean(),
  defaultFormulaId: z.string().optional(),
});

const formulaSchema = z.object({
  name: z.string().min(1, 'Formula name is required'),
  description: z.string().optional(),
  winPoints: z.number().min(0, 'Win points must be non-negative'),
  drawPoints: z.number().min(0, 'Draw points must be non-negative'),
  lossPoints: z.number().min(0, 'Loss points must be non-negative'),
  bonusRules: z.array(z.object({
    condition: z.string(),
    points: z.number(),
    description: z.string(),
  })).optional(),
  isActive: z.boolean(),
});

type TournamentSettingsFormData = z.infer<typeof tournamentSettingsSchema>;
type FormulaFormData = z.infer<typeof formulaSchema>;

export default function TournamentSettingsPage() {
  const [_, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin, canManageFormulas } = useTournamentPermissions(parseInt(id || '0'));
  const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<LeaderboardFormula | null>(null);

  // Fetch tournament data
  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${id}`],
    enabled: !!id,
  });

  // Fetch formulas for this tournament
  const { data: formulas = [], isLoading: formulasLoading } = useQuery<LeaderboardFormula[]>({
    queryKey: [`/api/tournaments/${id}/formulas`],
    enabled: !!id,
  });

  // Tournament settings form
  const settingsForm = useForm<TournamentSettingsFormData>({
    resolver: zodResolver(tournamentSettingsSchema),
    defaultValues: {
      name: tournament?.name || '',
      description: tournament?.description || '',
      gameType: tournament?.gameType || '',
      startDate: tournament?.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : '',
      endDate: tournament?.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : '',
      isActive: tournament?.isActive ?? true,
      defaultFormulaId: tournament?.defaultFormulaId || '',
    },
  });

  // Formula form
  const formulaForm = useForm<FormulaFormData>({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      name: '',
      description: '',
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      bonusRules: [],
      isActive: true,
    },
  });

  // Update tournament settings
  const updateTournamentMutation = useMutation({
    mutationFn: async (data: TournamentSettingsFormData) => {
      const res = await apiRequest('PATCH', `/api/tournaments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Tournament updated successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${id}`] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update tournament', description: error.message, variant: 'destructive' });
    },
  });

  // Create/update formula
  const saveFormulaMutation = useMutation({
    mutationFn: async (data: FormulaFormData) => {
      const formulaData = {
        ...data,
        tournamentId: id,
        bonusRules: data.bonusRules || [],
      };

      if (editingFormula) {
        const res = await apiRequest('PATCH', `/api/formulas/${editingFormula.id}`, formulaData);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/formulas', formulaData);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingFormula ? 'Formula updated' : 'Formula created successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${id}/formulas`] });
      setIsFormulaDialogOpen(false);
      setEditingFormula(null);
      formulaForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save formula', description: error.message, variant: 'destructive' });
    },
  });

  // Delete formula
  const deleteFormulaMutation = useMutation({
    mutationFn: async (formulaId: string) => {
      await apiRequest('DELETE', `/api/formulas/${formulaId}`);
    },
    onSuccess: () => {
      toast({ title: 'Formula deleted successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${id}/formulas`] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete formula', description: error.message, variant: 'destructive' });
    },
  });

  // Check permissions
  if (!user || (!isAdmin && !canManageFormulas)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to manage tournament settings.</p>
            <Button onClick={() => setLocation('/tournaments')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tournamentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const onSettingsSubmit = (data: TournamentSettingsFormData) => {
    updateTournamentMutation.mutate(data);
  };

  const onFormulaSubmit = (data: FormulaFormData) => {
    saveFormulaMutation.mutate(data);
  };

  const handleEditFormula = (formula: LeaderboardFormula) => {
    setEditingFormula(formula);
    formulaForm.reset({
      name: formula.name,
      description: formula.description || '',
      winPoints: formula.winPoints,
      drawPoints: formula.drawPoints,
      lossPoints: formula.lossPoints,
      bonusRules: formula.bonusRules || [],
      isActive: formula.isActive,
    });
    setIsFormulaDialogOpen(true);
  };

  const handleNewFormula = () => {
    setEditingFormula(null);
    formulaForm.reset({
      name: '',
      description: '',
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      bonusRules: [],
      isActive: true,
    });
    setIsFormulaDialogOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarEnhanced />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setLocation(`/tournaments/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tournament
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Tournament Settings
              </h1>
              <p className="text-gray-600 mt-1">Configure tournament settings and leaderboard formulas</p>
            </div>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="formulas">Leaderboard Formulas</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Tournament Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...settingsForm}>
                    <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={settingsForm.control}
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
                          control={settingsForm.control}
                          name="gameType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Game Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Chess, Dominoes, Checkers" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
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
                          control={settingsForm.control}
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
                        control={settingsForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the tournament..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between">
                        <FormField
                          control={settingsForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Tournament Active</FormLabel>
                                <FormDescription>
                                  Whether the tournament is currently accepting new games and participants
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={updateTournamentMutation.isPending} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {updateTournamentMutation.isPending ? 'Saving...' : 'Save Tournament Settings'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="formulas">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Leaderboard Formulas
                      </CardTitle>
                      <Button onClick={handleNewFormula}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Formula
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {formulasLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : formulas.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No formulas created yet. Create your first formula to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formulas.map((formula) => (
                          <Card key={formula.id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold">{formula.name}</h3>
                                    {formula.isActive ? (
                                      <Badge variant="default">Active</Badge>
                                    ) : (
                                      <Badge variant="secondary">Inactive</Badge>
                                    )}
                                    {tournament?.defaultFormulaId === formula.id && (
                                      <Badge variant="outline">Default</Badge>
                                    )}
                                  </div>
                                  {formula.description && (
                                    <p className="text-sm text-gray-600 mb-3">{formula.description}</p>
                                  )}
                                  <div className="flex gap-4 text-sm">
                                    <span>Win: <strong>{formula.winPoints} pts</strong></span>
                                    <span>Draw: <strong>{formula.drawPoints} pts</strong></span>
                                    <span>Loss: <strong>{formula.lossPoints} pts</strong></span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditFormula(formula)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteFormulaMutation.mutate(formula.id)}
                                    disabled={tournament?.defaultFormulaId === formula.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Formula Dialog */}
          <Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFormula ? 'Edit Formula' : 'Create New Formula'}
                </DialogTitle>
                <DialogDescription>
                  Define how points are calculated for games in this tournament.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...formulaForm}>
                <form onSubmit={formulaForm.handleSubmit(onFormulaSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={formulaForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formula Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Standard Points" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formulaForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Active</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={formulaForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe this formula..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={formulaForm.control}
                      name="winPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Win Points</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formulaForm.control}
                      name="drawPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Draw Points</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formulaForm.control}
                      name="lossPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loss Points</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsFormulaDialogOpen(false);
                        setEditingFormula(null);
                        formulaForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveFormulaMutation.isPending}>
                      {saveFormulaMutation.isPending ? 'Saving...' : editingFormula ? 'Update Formula' : 'Create Formula'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}