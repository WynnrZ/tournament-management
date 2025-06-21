import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SidebarEnhanced from "@/components/layout/sidebar-enhanced";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Send, Trophy, Receipt, Calendar, Users, Megaphone, TestTube, AlertCircle, CheckCircle, Search, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Player {
  id: string;
  name: string;
  email: string;
}

interface Tournament {
  id: string;
  name: string;
}

export default function EmailManagementEnhanced() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("test");
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    playerName: "",
    tournamentName: "",
    month: "",
    year: "",
    amount: "",
    currency: "USD",
    subscriptionType: "monthly",
    subject: "",
    message: ""
  });


  const isAdmin = user?.isAdmin || user?.isAppAdmin;
  const isAppAdmin = user?.isAppAdmin;

  // Get tournaments based on user role
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: isAppAdmin ? ["/api/tournaments"] : ["/api/my-tournaments"],
    enabled: !!user
  });

  // Get players for selected tournament
  const { data: tournamentPlayers = [] } = useQuery<Player[]>({
    queryKey: [`/api/tournaments/${selectedTournament}/players`],
    enabled: !!selectedTournament && selectedTournament !== "all",
  });

  // Get all players if app admin and no tournament selected or "all" selected
  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: isAppAdmin && (!selectedTournament || selectedTournament === "all"),
  });

  // Get email queue status
  const { data: emailQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/email-queue"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const availablePlayers = selectedTournament && selectedTournament !== "all" ? tournamentPlayers : (isAppAdmin ? allPlayers : []);

  useEffect(() => {
    if (selectedPlayer) {
      const player = availablePlayers.find(p => p.id === selectedPlayer);
      if (player) {
        setEmailData(prev => ({
          ...prev,
          playerName: player.name
        }));
        setCustomEmail(player.email || "");
      }
    }
  }, [selectedPlayer, availablePlayers]);

  useEffect(() => {
    if (selectedTournament) {
      const tournament = tournaments.find(t => t.id === selectedTournament);
      if (tournament) {
        setEmailData(prev => ({
          ...prev,
          tournamentName: tournament.name
        }));
      }
    }
  }, [selectedTournament, tournaments]);

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = `/api/emails/${selectedTemplate}`;
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: (response) => {
      if (response.usedFallback) {
        toast({
          title: "Email Logged (SendGrid Unavailable)",
          description: "Email has been logged for manual processing. SendGrid API key may be invalid.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Sent Successfully",
          description: "Your professional email has been delivered.",
        });
      }
      
      // Reset form
      setSelectedPlayer("");
      setCustomEmail("");
      setEmailData({
        playerName: "",
        tournamentName: "",
        month: "",
        year: "",
        amount: "",
        currency: "USD",
        subscriptionType: "monthly",
        subject: "",
        message: ""
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/email-queue"] });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  // Save Resend API key mutation
  // SMTP email service is configured via environment variables

  const handleSendEmail = () => {
    const emailAddress = customEmail.trim();
    if (!emailAddress) {
      toast({
        title: "Email Required",
        description: "Please enter an email address or select a player with an email.",
        variant: "destructive",
      });
      return;
    }

    let emailPayload: any = { 
      to: emailAddress,
      tournamentId: selectedTournament 
    };

    switch (selectedTemplate) {
      case "player-of-month":
        emailPayload.playerData = {
          playerName: emailData.playerName,
          tournamentName: emailData.tournamentName,
          month: emailData.month,
          year: emailData.year,
          stats: {
            gamesPlayed: 25,
            wins: 20,
            losses: 3,
            draws: 2,
            winRate: 80,
            totalPoints: 150,
            rank: 1
          },
          achievements: [
            "Monthly Win Streak Champion",
            "Perfect Game Achievement",
            "Top Scorer of the Month"
          ],
          topOpponents: [
            { name: "Player Two", record: "3-1" },
            { name: "Player Three", record: "2-1" }
          ]
        };
        break;
      case "subscription-receipt":
        emailPayload.receiptData = {
          playerName: emailData.playerName,
          email: emailAddress,
          subscriptionType: emailData.subscriptionType,
          amount: emailData.amount,
          currency: emailData.currency,
          paymentDate: new Date().toISOString().split('T')[0],
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          transactionId: `TXN_${Date.now()}`,
          invoiceNumber: `INV_${Date.now()}`,
          companyName: "WynnrZ Tournament System",
          companyAddress: "123 Tournament St, Competition City, TC 12345"
        };
        break;
      case "welcome":
        emailPayload.welcomeData = {
          playerName: emailData.playerName,
          username: emailData.playerName.toLowerCase().replace(/\s+/g, ''),
          tournamentName: emailData.tournamentName,
          loginUrl: `${window.location.origin}/auth`,
          supportEmail: "support@wynnrz.com"
        };
        break;
      case "tournament-announcement":
        emailPayload.announcementData = {
          playerName: emailData.playerName,
          tournamentName: emailData.tournamentName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          gameType: "Tournament Game",
          registrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          prizePool: "$1,000",
          description: "Join us for an exciting tournament experience!"
        };
        break;
      case "custom":
        emailPayload.customData = {
          subject: emailData.subject,
          message: emailData.message,
          playerName: emailData.playerName
        };
        break;
      case "test":
        // Test email doesn't need additional data
        break;
    }

    sendEmailMutation.mutate(emailPayload);
  };

  const getEmailContent = () => {
    switch (selectedTemplate) {
      case "player-of-month":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                value={emailData.month}
                onChange={(e) => setEmailData(prev => ({ ...prev, month: e.target.value }))}
                placeholder="January"
              />
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={emailData.year}
                onChange={(e) => setEmailData(prev => ({ ...prev, year: e.target.value }))}
                placeholder="2024"
              />
            </div>
          </div>
        );
      case "subscription-receipt":
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={emailData.amount}
                onChange={(e) => setEmailData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="29.99"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={emailData.currency} onValueChange={(value) => setEmailData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subscriptionType">Subscription Type</Label>
              <Select value={emailData.subscriptionType} onValueChange={(value) => setEmailData(prev => ({ ...prev, subscriptionType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "custom":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Your custom message..."
                rows={6}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-100">
        <SidebarEnhanced />
        <div className="flex-1 md:ml-64 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You need administrator privileges to access email management.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-100">
      <SidebarEnhanced />
      <div className="flex-1 md:ml-64">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-blue-900 mb-4">Email Management</h1>
            <p className="text-lg text-blue-700">Send professional emails to players and manage communications.</p>
          </div>

          <Tabs defaultValue="send" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-blue-100">
              <TabsTrigger value="send" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Send Emails
              </TabsTrigger>
              <TabsTrigger value="queue" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Email Queue ({Array.isArray(emailQueue) ? emailQueue.length : 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Mail className="h-5 w-5" />
                      Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure email recipients and template settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* SMTP Email Service Status */}
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="space-y-2">
                            <p className="text-green-800 font-medium">
                              SMTP Email Service Ready
                            </p>
                            <p className="text-green-700 text-sm">
                              Email delivery is configured via Resend SMTP (smtp.resend.com:465).
                              Emails will be sent directly through SMTP for reliable delivery.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tournament Selection (App Admin only) */}
                    {isAppAdmin && (
                      <div>
                        <Label htmlFor="tournament">Tournament</Label>
                        <Popover open={tournamentOpen} onOpenChange={setTournamentOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={tournamentOpen}
                              className="w-full justify-between"
                            >
                              {selectedTournament
                                ? selectedTournament === "all"
                                  ? "All Tournaments"
                                  : tournaments.find((t) => t.id === selectedTournament)?.name
                                : "Select tournament (optional)"}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search tournaments..." />
                              <CommandList>
                                <CommandEmpty>No tournament found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="all"
                                    onSelect={() => {
                                      setSelectedTournament("all");
                                      setSelectedPlayer("");
                                      setTournamentOpen(false);
                                    }}
                                  >
                                    All Tournaments
                                  </CommandItem>
                                  {tournaments.map((tournament) => (
                                    <CommandItem
                                      key={tournament.id}
                                      value={tournament.name}
                                      onSelect={() => {
                                        setSelectedTournament(tournament.id);
                                        setSelectedPlayer("");
                                        setTournamentOpen(false);
                                      }}
                                    >
                                      {tournament.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Player Selection */}
                    <div>
                      <Label htmlFor="player">Player</Label>
                      <Popover open={playerOpen} onOpenChange={setPlayerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={playerOpen}
                            className="w-full justify-between"
                          >
                            {selectedPlayer
                              ? availablePlayers.find((p) => p.id === selectedPlayer)?.name ||
                                "Unknown player"
                              : "Select player (optional)"}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search players..." />
                            <CommandList>
                              <CommandEmpty>No player found.</CommandEmpty>
                              <CommandGroup>
                                {availablePlayers.length > 0 ? (
                                  availablePlayers.map((player) => (
                                    <CommandItem
                                      key={player.id}
                                      value={`${player.name} ${player.email || ''}`}
                                      onSelect={() => {
                                        setSelectedPlayer(player.id);
                                        setPlayerOpen(false);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span>{player.name}</span>
                                        {player.email ? (
                                          <span className="text-sm text-muted-foreground">
                                            {player.email}
                                          </span>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">
                                            (No email)
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))
                                ) : (
                                  <CommandItem disabled>No players available</CommandItem>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Custom Email Input */}
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>

                    {/* Template Selection */}
                    <div>
                      <Label htmlFor="template">Email Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">
                            <div className="flex items-center gap-2">
                              <TestTube className="h-4 w-4" />
                              Test Email
                            </div>
                          </SelectItem>
                          <SelectItem value="welcome">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Welcome Email
                            </div>
                          </SelectItem>
                          <SelectItem value="player-of-month">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4" />
                              Player of the Month
                            </div>
                          </SelectItem>
                          <SelectItem value="subscription-receipt">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4" />
                              Subscription Receipt
                            </div>
                          </SelectItem>
                          <SelectItem value="tournament-announcement">
                            <div className="flex items-center gap-2">
                              <Megaphone className="h-4 w-4" />
                              Tournament Announcement
                            </div>
                          </SelectItem>
                          <SelectItem value="custom">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Custom Email
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Send className="h-5 w-5" />
                      Template Content
                    </CardTitle>
                    <CardDescription>
                      Configure template-specific content and data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getEmailContent()}
                    
                    <Button 
                      onClick={handleSendEmail}
                      disabled={sendEmailMutation.isPending || !customEmail.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="queue">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Mail className="h-5 w-5" />
                    Email Queue Status
                  </CardTitle>
                  <CardDescription>
                    View queued emails and delivery status. Emails are logged when SMTP delivery fails.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!Array.isArray(emailQueue) || emailQueue.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No emails in queue.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {emailQueue.map((email: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{email.subject}</h4>
                            <p className="text-sm text-gray-600">To: {email.to}</p>
                            <p className="text-xs text-gray-500">{email.timestamp}</p>
                          </div>
                          <Badge variant={email.status === 'logged' ? 'secondary' : 'default'}>
                            {email.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}