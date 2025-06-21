import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings as SettingsIcon, Shield, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tournament, LeaderboardFormula } from "@shared/schema";
import { Card, CardHeader, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SubscriptionInfoCard } from "@/components/subscription/subscription-info-card";
import { SubscriptionUpgradeSection } from "@/components/subscription/subscription-upgrade-section";
import { SubscriptionDetailsCard } from "@/components/subscription/subscription-details-card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { BiometricLogin } from "@/components/auth/biometric-login";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  profileImage: z.string().optional(),
});

const securitySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  weeklyReports: z.boolean(),
  gameResults: z.boolean(),
  tournamentUpdates: z.boolean(),
  mobileAppNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  socialUpdates: z.boolean(),
  achievementAlerts: z.boolean(),
});

function BiometricAuthSettings() {
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { toast } = useToast();

  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        if (!window.PublicKeyCredential) {
          setIsChecking(false);
          return;
        }
        
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setHasBiometric(available);
      } catch (error) {
        console.error('Error checking biometric support:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkBiometricSupport();
  }, []);

  // Check if user has registered biometric credentials
  const { data: biometricStatus, refetch: refetchBiometricStatus } = useQuery({
    queryKey: ['/api/auth/biometric/status'],
    enabled: hasBiometric,
  });

  // Toggle biometric authentication
  const toggleBiometricMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) {
        // Register new biometric credential
        const registerResponse = await fetch('/api/auth/biometric/register-challenge', {
          method: 'POST',
          credentials: 'include',
        });

        if (!registerResponse.ok) {
          throw new Error('Failed to get registration challenge');
        }

        const { challenge, user } = await registerResponse.json();

        // Create credential
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))),
            rp: {
              name: "WynnrZ Tournament Platform",
              id: window.location.hostname,
            },
            user: {
              id: new TextEncoder().encode(user.id),
              name: user.username,
              displayName: user.name,
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" }, // ES256
              { alg: -257, type: "public-key" }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          }
        }) as PublicKeyCredential;

        if (!credential) {
          throw new Error('Failed to create credential');
        }

        // Register credential with server
        const response = credential.response as AuthenticatorAttestationResponse;
        const registrationData = {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            attestationObject: Array.from(new Uint8Array(response.attestationObject)),
            clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          },
          type: credential.type,
        };

        const registerRes = await apiRequest('POST', '/api/auth/biometric/register', registrationData);
        if (!registerRes.ok) {
          throw new Error('Failed to register biometric credential');
        }
        
        return true;
      } else {
        // Disable biometric authentication
        const response = await apiRequest('DELETE', '/api/auth/biometric/disable');
        if (!response.ok) {
          throw new Error('Failed to disable biometric authentication');
        }
        return false;
      }
    },
    onSuccess: (enabled) => {
      toast({
        title: enabled ? "Biometric authentication enabled" : "Biometric authentication disabled",
        description: enabled 
          ? "You can now use fingerprint or facial recognition to log in."
          : "Biometric authentication has been disabled for your account.",
      });
      refetchBiometricStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Biometric authentication error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isChecking) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking biometric support...</span>
      </div>
    );
  }

  if (!hasBiometric) {
    return (
      <div className="flex items-center space-x-2 text-slate-500">
        <AlertTriangle className="h-4 w-4" />
        <span>Biometric authentication is not available on this device</span>
      </div>
    );
  }

  const isEnabled = biometricStatus?.enabled || false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">Enable Biometric Login</h4>
          <p className="text-sm text-slate-500">
            Use fingerprint or facial recognition for quick and secure access
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => toggleBiometricMutation.mutate(checked)}
          disabled={toggleBiometricMutation.isPending}
        />
      </div>
      
      {isEnabled && (
        <div className="flex items-center space-x-2 text-green-600">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Biometric authentication is active</span>
        </div>
      )}
    </div>
  );
}

function TournamentSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.userType === 'admin' || user?.isAdmin;
  
  // Fetch user's tournaments only
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/my-tournaments"],
  });

  // Filter tournaments where current user is administrator
  const adminTournaments = tournaments.filter(tournament => 
    tournament.createdBy === user?.id
  );

  // Fetch formulas (only for admins)
  const { data: formulas = [], isLoading: formulasLoading } = useQuery<LeaderboardFormula[]>({
    queryKey: ["/api/leaderboard-formulas"],
    enabled: isAdmin,
  });

  // Debug logging
  console.log("Formulas data:", formulas);
  console.log("Formulas loading:", formulasLoading);

  // Update tournament formula mutation
  const updateTournamentMutation = useMutation({
    mutationFn: async ({ tournamentId, formulaId }: { tournamentId: number; formulaId: number | null }) => {
      console.log("Sending PATCH request:", { tournamentId, formulaId });
      const res = await apiRequest("PATCH", `/api/tournaments/${tournamentId}`, {
        defaultFormulaId: formulaId
      });
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.log("Error data:", errorData);
        throw new Error(errorData.message || "Failed to update tournament formula");
      }
      
      const responseText = await res.text();
      console.log("Raw response text:", responseText);
      
      try {
        const responseData = JSON.parse(responseText);
        console.log("Success response data:", responseData);
        return responseData;
      } catch (parseError) {
        console.log("JSON parse error:", parseError);
        console.log("Response was not JSON, but request succeeded");
        // If JSON parsing fails but request succeeded, just return success
        return { success: true };
      }
    },
    onSuccess: (data) => {
      console.log("Mutation success with data:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Formula assignment updated",
        description: "The scoring formula has been successfully assigned to the tournament.",
      });
    },
    onError: (error: Error) => {
      console.log("Mutation error:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete formula mutation
  const deleteFormulaMutation = useMutation({
    mutationFn: async (formulaId: number) => {
      const res = await apiRequest("DELETE", `/api/leaderboard-formulas/${formulaId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete formula");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard-formulas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Formula deleted",
        description: "The formula has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Don't show this section for non-admin users
  if (!isAdmin) {
    return null;
  }

  if (tournamentsLoading || formulasLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Tournament Formula Assignment</h3>
        <CardDescription>
          Assign scoring formulas to tournaments to customize how points are calculated for games.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {adminTournaments.map((tournament) => (
            <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{tournament.name}</h4>
                <p className="text-sm text-gray-500">{tournament.description}</p>
              </div>
              <div className="w-64">
                <Select
                  value={tournament.defaultFormulaId?.toString() || "default"}
                  onValueChange={(value) => {
                    const formulaId = value === "default" ? null : parseInt(value);
                    updateTournamentMutation.mutate({
                      tournamentId: tournament.id,
                      formulaId
                    });
                  }}
                  disabled={updateTournamentMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a formula..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Scoring (1 point for wins)</SelectItem>
                    {formulas.map((formula) => (
                      <SelectItem key={formula.id} value={formula.id.toString()}>
                        {formula.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          
          {adminTournaments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {tournaments.length === 0 
                ? "No tournaments found. Create a tournament first to assign formulas."
                : "You are not an administrator of any tournaments. Only tournament administrators can assign scoring formulas."
              }
            </div>
          )}
          
          {formulas.length === 0 && !formulasLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-800 text-sm">
                <strong>No custom formulas found.</strong> Visit the Formula Builder to create custom scoring rules first.
              </p>
            </div>
          )}
          
          {formulas.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium mb-4">Manage Formulas</h4>
              <div className="space-y-4">
                {formulas.map((formula) => (
                  <div key={formula.id} className="border rounded-lg bg-white shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-lg">{formula.name}</h5>
                            {formula.isDefault && (
                              <Badge variant="secondary" className="text-xs">Template</Badge>
                            )}
                          </div>
                          
                          {formula.formula?.description && (
                            <div className="bg-slate-50 border-l-4 border-slate-400 p-3 mb-4">
                              <p className="text-sm text-slate-700 font-medium">Formula Description</p>
                              <p className="text-sm text-slate-600 mt-1">{formula.formula.description}</p>
                            </div>
                          )}
                          
                          <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-sm">
                                <span className="font-semibold text-blue-800">Default Scoring:</span> 
                                <div className="mt-1 text-blue-700">
                                  Winner: <span className="font-mono bg-blue-100 px-1 rounded">{formula.formula?.defaultWinnerPoints || 1} points</span>, 
                                  Loser: <span className="font-mono bg-blue-100 px-1 rounded">{formula.formula?.defaultLoserPoints || 0} points</span>
                                </div>
                              </div>
                            </div>
                            
                            {formula.formula?.rules && formula.formula.rules.length > 0 && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                <span className="font-semibold text-emerald-800 text-sm">Special Rules:</span>
                                <ul className="mt-2 space-y-2">
                                  {formula.formula.rules.map((rule: any, index: number) => (
                                    <li key={index} className="text-emerald-700 text-sm bg-emerald-100 p-2 rounded border-l-2 border-emerald-400">
                                      <span className="font-medium">Rule {index + 1}:</span> {rule.description || `${rule.condition?.type} ${rule.condition?.operator} ${rule.condition?.value}: Winner ${rule.winnerPoints}, Loser ${rule.loserPoints}`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                              {formula.tournamentId && (
                                <span>Tournament: {tournaments.find(t => t.id === formula.tournamentId)?.name || 'Unknown'}</span>
                              )}
                              {formula.createdAt && (
                                <span>Created: {new Date(formula.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {!formula.isDefault && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Formula</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{formula.name}"? This action cannot be undone.
                                  {formula.tournamentId && (
                                    <span className="block mt-2 text-sm">
                                      This will remove the formula from the tournament: {tournaments.find(t => t.id === formula.tournamentId)?.name}
                                    </span>
                                  )}
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteFormulaMutation.mutate(formula.id)}
                                  disabled={deleteFormulaMutation.isPending}
                                >
                                  {deleteFormulaMutation.isPending ? "Deleting..." : "Delete Formula"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Check if user is admin
  const isAdmin = (user as any)?.is_admin === true;
  const [activeTab, setActiveTab] = useState(isAdmin ? "tournaments" : "profile");
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [pendingPasswordData, setPendingPasswordData] = useState<z.infer<typeof securitySchema> | null>(null);



  // Profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  // Security form
  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification form
  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      weeklyReports: true,
      gameResults: true,
      tournamentUpdates: true,
      mobileAppNotifications: false,
      pushNotifications: false,
      socialUpdates: true,
      achievementAlerts: true,
    },
  });



  // Password update mutation
  const passwordUpdateMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PUT", "/api/user/password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update password");
      }
      return await res.json();
    },
    onSuccess: () => {
      securityForm.reset();
      setShowPasswordConfirmDialog(false);
      setPendingPasswordData(null);
      toast({
        title: "Password updated successfully",
        description: "Your password has been changed. Please use your new password for future logins.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile update
  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully.",
    });
  };

  // Handle security update
  const onSecuritySubmit = (values: z.infer<typeof securitySchema>) => {
    setPendingPasswordData(values);
    setShowPasswordConfirmDialog(true);
  };

  // Confirm password update
  const confirmPasswordUpdate = () => {
    if (pendingPasswordData) {
      passwordUpdateMutation.mutate({
        currentPassword: pendingPasswordData.currentPassword,
        newPassword: pendingPasswordData.newPassword,
      });
    }
  };

  // Fetch notification preferences
  const { data: notificationPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/settings/notification-preferences"],
    retry: false,
  });

  // Update notification preferences mutation
  const updateNotificationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof notificationSchema>) => {
      const res = await apiRequest("POST", "/api/settings/notification-preferences", values);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update notification preferences");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/notification-preferences"] });
      toast({
        title: "Notification preferences updated",
        description: "Your notification preferences have been updated successfully.",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle notification update
  const onNotificationSubmit = (values: z.infer<typeof notificationSchema>) => {
    updateNotificationMutation.mutate(values);
  };

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
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
                  Settings
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Manage your account settings and preferences.
                </p>
              </motion.div>
            </div>

            {/* Settings Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {isAdmin && <TabsTrigger value="tournaments">Tournament Settings</TabsTrigger>}
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                {isAdmin && (
                  <TabsContent value="tournaments">
                    <TournamentSettings />
                  </TabsContent>
                )}



                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Profile Information</h3>
                      <CardDescription>
                        Update your personal information and email address.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                          {/* Profile Photo Upload */}
                          <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                            <h4 className="text-lg font-medium">Profile Photo</h4>
                            <PhotoUpload
                              currentImageUrl={profileForm.watch("profileImage")}
                              onImageChange={(imageUrl) => profileForm.setValue("profileImage", imageUrl || "")}
                              fallbackText={user?.name || "User"}
                              size="large"
                            />
                          </div>

                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Enter your email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bio</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Tell us about yourself..." 
                                    className="min-h-[100px]" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button type="submit">
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Subscription Details */}
                  <SubscriptionDetailsCard />
                </TabsContent>

                <TabsContent value="security">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Security</h3>
                      <CardDescription>
                        Update your password and security settings.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...securityForm}>
                        <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                          <FormField
                            control={securityForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter your current password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={securityForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter your new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={securityForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirm your new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={passwordUpdateMutation.isPending}>
                            {passwordUpdateMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating Password...
                              </>
                            ) : (
                              <>
                                <Shield className="mr-2 h-4 w-4" />
                                Update Password
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Biometric Authentication Settings */}
                  <Card className="mt-6">
                    <CardHeader>
                      <h3 className="text-lg font-medium">Biometric Authentication</h3>
                      <CardDescription>
                        Use fingerprint or facial recognition for secure login.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BiometricAuthSettings />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Notification Preferences</h3>
                      <CardDescription>
                        Manage how you receive notifications and updates.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...notificationForm}>
                        <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                          <FormField
                            control={notificationForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Receive notifications via email
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="mobileAppNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Mobile App Notifications</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Receive notifications through the mobile app
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="pushNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Push Notifications</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Receive real-time push notifications on your device
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="weeklyReports"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Weekly Reports</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Receive weekly performance summaries
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="gameResults"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Game Results</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Get notified when game results are posted
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="tournamentUpdates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Tournament Updates</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Receive updates about tournament changes and announcements
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="achievementAlerts"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Achievement Alerts</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Get notified when you unlock new achievements
                                  </p>
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
                          <FormField
                            control={notificationForm.control}
                            name="socialUpdates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Social Updates</FormLabel>
                                  <p className="text-sm text-gray-500">
                                    Receive notifications about social activities and follows
                                  </p>
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
                          <Button type="submit">
                            <Save className="mr-2 h-4 w-4" />
                            Save Preferences
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </main>
      </div>
      
      <MobileNav />
      
      {/* Password Update Confirmation Dialog */}
      <Dialog open={showPasswordConfirmDialog} onOpenChange={setShowPasswordConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Password Update
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to update your password? This action cannot be undone and you'll need to use your new password for future logins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm text-amber-800">
                <strong>Security reminder:</strong> Make sure to store your new password securely. You'll be required to log in again with the new password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordConfirmDialog(false);
                setPendingPasswordData(null);
              }}
              disabled={passwordUpdateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPasswordUpdate}
              disabled={passwordUpdateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {passwordUpdateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}