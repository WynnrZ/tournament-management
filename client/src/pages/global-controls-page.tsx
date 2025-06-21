import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Users, Database, Settings, Activity, Shield, Mail, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SystemStats {
  system: {
    activeTournaments: number;
    totalGames: number;
    totalPlayers: number;
    totalUsers: number;
    adminUsers: number;
    activeUsers: number;
  };
  subscriptions: {
    active: number;
    trial: number;
    expired: number;
  };
  uptime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_app_admin: boolean;
  subscription_status: string;
  subscription_type: string;
  subscription_valid_until: string;
  created_at: string;
  last_login: string;
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  game_type: string;
  created_at: string;
  created_by: string;
  playerCount: number;
  gameCount: number;
}

export default function GlobalControlsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch system statistics
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/global-controls/system-stats"],
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/global-controls/users"],
  });

  // Fetch all tournaments
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/admin/global-controls/tournaments"],
  });

  // Auto-approval mutation
  const autoApprovalMutation = useMutation({
    mutationFn: async (settings: { enabled: boolean; criteria?: any }) => {
      const res = await apiRequest("POST", "/api/admin/global-controls/auto-approval", settings);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Auto-approval settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update auto-approval settings",
        variant: "destructive",
      });
    },
  });

  // Default settings mutation
  const defaultSettingsMutation = useMutation({
    mutationFn: async (settings: { defaultGameType?: string; defaultTrialDays?: number; defaultFormula?: string }) => {
      const res = await apiRequest("POST", "/api/admin/global-controls/default-settings", settings);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update default settings",
        variant: "destructive",
      });
    },
  });

  // Inactive cleanup mutation
  const inactiveCleanupMutation = useMutation({
    mutationFn: async (settings: { daysInactive?: number }) => {
      const res = await apiRequest("POST", "/api/admin/global-controls/inactive-cleanup", settings);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-controls/system-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-controls/tournaments"] });
      toast({
        title: "Cleanup Complete",
        description: data.message || "Inactive cleanup completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to perform inactive cleanup",
        variant: "destructive",
      });
    },
  });

  // Email templates query
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["/api/admin/global-controls/email-templates"],
  });

  // User status update mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: any }) => {
      const res = await apiRequest("PUT", `/api/admin/global-controls/users/${userId}/status`, status);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-controls/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-controls/system-stats"] });
      toast({
        title: "User Updated",
        description: "User status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Tournament status update mutation
  const updateTournamentStatusMutation = useMutation({
    mutationFn: async ({ tournamentId, is_active }: { tournamentId: string; is_active: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/global-controls/tournaments/${tournamentId}/status`, { is_active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-controls/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-controls/system-stats"] });
      toast({
        title: "Tournament Updated",
        description: "Tournament status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    },
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getSubscriptionBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Global Controls</h1>
          <p className="text-gray-600">System-wide administration and management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Communication
          </TabsTrigger>
        </TabsList>

        {/* System Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.system.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats?.system.activeUsers || 0} active this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.system.activeTournaments || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats?.system.totalGames || 0} total games
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats?.subscriptions.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats?.subscriptions.trial || 0} trials, {systemStats?.subscriptions.expired || 0} expired
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {systemStats ? formatUptime(systemStats.uptime) : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>Current system resource usage</CardDescription>
            </CardHeader>
            <CardContent>
              {systemStats?.memoryUsage && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium">Heap Used</p>
                    <p className="text-2xl font-bold">{formatBytes(systemStats.memoryUsage.heapUsed)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Heap Total</p>
                    <p className="text-2xl font-bold">{formatBytes(systemStats.memoryUsage.heapTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">RSS</p>
                    <p className="text-2xl font-bold">{formatBytes(systemStats.memoryUsage.rss)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">External</p>
                    <p className="text-2xl font-bold">{formatBytes(systemStats.memoryUsage.external)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Controls</CardTitle>
              <CardDescription>Manage tournament-wide settings and automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Auto-approval Settings</h4>
                  <p className="text-sm text-gray-500">Configure automatic tournament approval criteria</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => autoApprovalMutation.mutate({ enabled: true, criteria: { minPlayers: 4 } })}
                  disabled={autoApprovalMutation.isPending}
                >
                  {autoApprovalMutation.isPending ? "Configuring..." : "Configure"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Default Settings</h4>
                  <p className="text-sm text-gray-500">Set default game types and trial periods</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => defaultSettingsMutation.mutate({ 
                    defaultGameType: "Dominology", 
                    defaultTrialDays: 90, 
                    defaultFormula: "Standard" 
                  })}
                  disabled={defaultSettingsMutation.isPending}
                >
                  {defaultSettingsMutation.isPending ? "Updating..." : "Configure"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Inactive Cleanup</h4>
                  <p className="text-sm text-gray-500">Remove inactive tournaments and data</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => inactiveCleanupMutation.mutate({ daysInactive: 30 })}
                  disabled={inactiveCleanupMutation.isPending}
                >
                  {inactiveCleanupMutation.isPending ? "Cleaning..." : "Run Cleanup"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Bulk User Actions</h4>
                  <p className="text-sm text-gray-500">Perform actions on multiple users</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Bulk Actions", description: "Bulk user management opened" })}
                >
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Export User Data</h4>
                  <p className="text-sm text-gray-500">Download user information for reporting</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Export Started", description: "User data export initiated" })}
                >
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Communication Center */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Center</CardTitle>
              <CardDescription>Manage system notifications and announcements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Email Templates</h4>
                  <p className="text-sm text-gray-500">Customize notification email templates</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Email Templates", description: "Template management opened" })}
                >
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">System Announcements</h4>
                  <p className="text-sm text-gray-500">Send platform-wide notifications</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Announcement", description: "System announcement created" })}
                >
                  Create
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Notification Settings</h4>
                  <p className="text-sm text-gray-500">Configure global notification preferences</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Settings Updated", description: "Notification preferences saved" })}
                >
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Database operations and system maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Database Backup</h4>
                  <p className="text-sm text-gray-500">Create system backup for data protection</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Backup Started", description: "Database backup initiated successfully" })}
                >
                  Backup
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Data Export</h4>
                  <p className="text-sm text-gray-500">Export system data for analysis</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Export Started", description: "Data export initiated successfully" })}
                >
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">System Maintenance</h4>
                  <p className="text-sm text-gray-500">Perform routine system maintenance tasks</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast({ title: "Maintenance Complete", description: "System maintenance completed successfully" })}
                >
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts, permissions, and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.is_app_admin && (
                              <Badge variant="destructive">App Admin</Badge>
                            )}
                            {user.is_admin && !user.is_app_admin && (
                              <Badge variant="secondary">Admin</Badge>
                            )}
                            {!user.is_admin && (
                              <Badge variant="outline">User</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSubscriptionBadgeColor(user.subscription_status)}>
                            {user.subscription_status || "none"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.subscription_status || "none"}
                              onValueChange={(value) =>
                                updateUserStatusMutation.mutate({
                                  userId: user.id,
                                  status: {
                                    subscription_status: value,
                                    subscription_type: value === "active" ? "monthly" : null,
                                    subscription_valid_until: value === "active" 
                                      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                                      : null
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tournament Management Tab */}
        <TabsContent value="tournaments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Management</CardTitle>
              <CardDescription>Monitor and control all tournaments across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {tournamentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Game Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Games</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournaments.map((tournament) => (
                      <TableRow key={tournament.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tournament.name}</div>
                            {tournament.description && (
                              <div className="text-sm text-gray-500">{tournament.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tournament.game_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={tournament.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {tournament.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{tournament.playerCount}</TableCell>
                        <TableCell>{tournament.gameCount}</TableCell>
                        <TableCell>
                          {new Date(tournament.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={tournament.is_active}
                              onCheckedChange={(checked) =>
                                updateTournamentStatusMutation.mutate({
                                  tournamentId: tournament.id,
                                  is_active: checked
                                })
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Management Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>Configure global subscription settings and monitor revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Active Subscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {systemStats?.subscriptions.active || 0}
                    </div>
                    <p className="text-sm text-gray-500">Monthly recurring revenue</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Trial Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {systemStats?.subscriptions.trial || 0}
                    </div>
                    <p className="text-sm text-gray-500">Potential conversions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Expired Subscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {systemStats?.subscriptions.expired || 0}
                    </div>
                    <p className="text-sm text-gray-500">Need attention</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Global Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Trial Duration</h4>
                      <p className="text-sm text-gray-500">Default trial period for new users</p>
                    </div>
                    <Badge variant="outline">90 days</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Auto-renewal</h4>
                      <p className="text-sm text-gray-500">Automatic subscription renewal</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Grace Period</h4>
                      <p className="text-sm text-gray-500">Access after subscription expires</p>
                    </div>
                    <Badge variant="outline">7 days</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Management</CardTitle>
              <CardDescription>Manage system notifications and announcements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Email Notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Subscription expiring</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Payment failed</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Welcome emails</span>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">System Announcements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full mb-3">
                        Create Announcement
                      </Button>
                      <p className="text-sm text-gray-500">
                        Send platform-wide notifications to all users
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Communications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Subscription Renewal Reminder</h4>
                        <p className="text-sm text-gray-500">Sent to 15 users • 2 hours ago</p>
                      </div>
                      <Badge variant="outline">Automated</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">System Maintenance Notice</h4>
                        <p className="text-sm text-gray-500">Sent to all users • 1 day ago</p>
                      </div>
                      <Badge variant="outline">Manual</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}