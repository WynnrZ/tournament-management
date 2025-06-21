import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Send, Trophy, Receipt, Calendar, Users, Megaphone, TestTube } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function EmailManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("test");
  const [emailData, setEmailData] = useState({
    to: "",
    playerName: "",
    tournamentName: "",
    month: "",
    year: "",
    amount: "",
    currency: "USD",
    subscriptionType: "monthly"
  });

  const isAdmin = user?.isAdmin || user?.isAppAdmin;

  const { data: tournaments } = useQuery({
    queryKey: ["/api/tournaments"],
  });

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = `/api/emails/${selectedTemplate}`;
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully",
        description: "Your professional email has been delivered.",
      });
      setEmailData({
        to: "",
        playerName: "",
        tournamentName: "",
        month: "",
        year: "",
        amount: "",
        currency: "USD",
        subscriptionType: "monthly"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    let emailPayload: any = { to: emailData.to };

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
          email: emailData.to,
          subscriptionType: emailData.subscriptionType,
          amount: emailData.amount,
          currency: emailData.currency,
          paymentDate: new Date().toLocaleDateString(),
          nextBillingDate: new Date(Date.now() + (emailData.subscriptionType === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          transactionId: `TXN-${Date.now()}`,
          invoiceNumber: `INV-${Date.now()}`,
          companyName: "WynnrZ Tournament Management",
          companyAddress: "123 Gaming Street, Tournament City, TC 12345"
        };
        break;
      
      case "upcoming-game":
        emailPayload.gameData = {
          playerName: emailData.playerName,
          tournamentName: emailData.tournamentName,
          gameDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          gameTime: "7:00 PM",
          opponent: "Challenger Player",
          gameType: "Team Match",
          round: "Semi-Final",
          matchupHistory: {
            wins: 2,
            losses: 1,
            lastPlayed: "Last Week"
          }
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
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          gameType: "Multi-Game Tournament",
          registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          prizePool: "$1,000",
          description: "Join our exciting tournament with players from around the world. Test your skills and compete for amazing prizes!"
        };
        break;
      
      case "test":
        // Test email only needs 'to' field
        break;
    }

    sendEmailMutation.mutate(emailPayload);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1 pb-16 md:pb-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Card>
                <CardContent className="p-6">
                  <p>Access denied. Admin privileges required.</p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const templateOptions = [
    { value: "test", label: "Test Email", icon: TestTube, description: "Send a test email to verify service" },
    { value: "player-of-month", label: "Player of the Month", icon: Trophy, description: "Award recognition with statistics" },
    { value: "subscription-receipt", label: "Subscription Receipt", icon: Receipt, description: "Payment confirmation and details" },
    { value: "upcoming-game", label: "Upcoming Game", icon: Calendar, description: "Match notification and preparation" },
    { value: "welcome", label: "Welcome Email", icon: Users, description: "New player onboarding" },
    { value: "tournament-announcement", label: "Tournament Announcement", icon: Megaphone, description: "New tournament promotion" },
  ];

  const selectedTemplateInfo = templateOptions.find(t => t.value === selectedTemplate);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Professional Email Management</h1>
              <p className="text-muted-foreground">
                Send professional emails using beautiful HTML templates for player communications
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template Selection */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>Choose a professional template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templateOptions.map((template) => {
                    const Icon = template.icon;
                    return (
                      <div
                        key={template.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTemplate === template.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedTemplate(template.value)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium">{template.label}</div>
                            <div className="text-sm text-muted-foreground">{template.description}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Email Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedTemplateInfo && <selectedTemplateInfo.icon className="h-5 w-5" />}
                    {selectedTemplateInfo?.label}
                  </CardTitle>
                  <CardDescription>{selectedTemplateInfo?.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="to">Recipient Email</Label>
                      <Input
                        id="to"
                        type="email"
                        placeholder="player@example.com"
                        value={emailData.to}
                        onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                        required
                      />
                    </div>

                    {selectedTemplate !== "test" && (
                      <div className="space-y-2">
                        <Label htmlFor="playerName">Player Name</Label>
                        <Input
                          id="playerName"
                          placeholder="Player Name"
                          value={emailData.playerName}
                          onChange={(e) => setEmailData({...emailData, playerName: e.target.value})}
                          required
                        />
                      </div>
                    )}
                  </div>

                  {["player-of-month", "upcoming-game", "welcome", "tournament-announcement"].includes(selectedTemplate) && (
                    <div className="space-y-2">
                      <Label htmlFor="tournamentName">Tournament</Label>
                      <Select value={emailData.tournamentName} onValueChange={(value) => setEmailData({...emailData, tournamentName: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tournament" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(tournaments) && tournaments.map((tournament: any) => (
                            <SelectItem key={tournament.id} value={tournament.name}>
                              {tournament.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedTemplate === "player-of-month" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="month">Month</Label>
                        <Select value={emailData.month} onValueChange={(value) => setEmailData({...emailData, month: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {["January", "February", "March", "April", "May", "June", 
                              "July", "August", "September", "October", "November", "December"].map((month) => (
                              <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input
                          id="year"
                          placeholder="2024"
                          value={emailData.year}
                          onChange={(e) => setEmailData({...emailData, year: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {selectedTemplate === "subscription-receipt" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          placeholder="5.29"
                          value={emailData.amount}
                          onChange={(e) => setEmailData({...emailData, amount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={emailData.currency} onValueChange={(value) => setEmailData({...emailData, currency: value})}>
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
                      <div className="space-y-2">
                        <Label htmlFor="subscriptionType">Type</Label>
                        <Select value={emailData.subscriptionType} onValueChange={(value) => setEmailData({...emailData, subscriptionType: value})}>
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
                  )}

                  <div className="pt-4">
                    <Button 
                      onClick={handleSendEmail} 
                      disabled={!emailData.to || sendEmailMutation.isPending}
                      className="w-full"
                    >
                      {sendEmailMutation.isPending ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send {selectedTemplateInfo?.label}
                        </>
                      )}
                    </Button>
                  </div>

                  {selectedTemplate !== "test" && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Template Preview Features:</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {selectedTemplate === "player-of-month" && (
                          <>
                            <p>• Beautiful trophy design with player statistics</p>
                            <p>• Win/loss records and achievements showcase</p>
                            <p>• Professional gradient styling and responsive layout</p>
                          </>
                        )}
                        {selectedTemplate === "subscription-receipt" && (
                          <>
                            <p>• Professional invoice format with transaction details</p>
                            <p>• Next billing date and subscription information</p>
                            <p>• Company branding and payment confirmation</p>
                          </>
                        )}
                        {selectedTemplate === "upcoming-game" && (
                          <>
                            <p>• Match details with VS layout design</p>
                            <p>• Head-to-head statistics and pre-game tips</p>
                            <p>• Tournament context and preparation guidance</p>
                          </>
                        )}
                        {selectedTemplate === "welcome" && (
                          <>
                            <p>• Welcoming design with feature highlights</p>
                            <p>• Login credentials and getting started guide</p>
                            <p>• Platform features overview and support contact</p>
                          </>
                        )}
                        {selectedTemplate === "tournament-announcement" && (
                          <>
                            <p>• Eye-catching tournament promotion design</p>
                            <p>• Registration details and prize information</p>
                            <p>• Compelling call-to-action and benefits list</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}