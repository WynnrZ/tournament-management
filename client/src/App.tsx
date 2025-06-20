import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TournamentsPage from "@/pages/tournaments-page";
import TournamentDetailPage from "@/pages/tournament-detail-page";
import PlayersPage from "@/pages/players-page";
import TeamsPage from "@/pages/teams-page";
import TeamManagementPage from "@/pages/team-management-page";
import LeaderboardsPage from "@/pages/leaderboards-page";
import MobileRecordPage from "@/pages/mobile-record-page";
import SettingsPage from "@/pages/settings-page";
import SimpleFormulaBuilder from "@/pages/simple-formula-builder";
import RawDataPage from "@/pages/raw-data-page";
import TournamentSettingsPage from "@/pages/tournament-settings-page";
import AppAdminPage from "@/pages/app-admin-page";
import GlobalControlsPage from "@/pages/global-controls-page";
import NotificationCenterPage from "@/pages/notification-center-simple";
import PlayerProfilePage from "@/pages/player-profile-page";
import EnhancedPlayerProfilePage from "@/pages/enhanced-player-profile-page";
import SocialAchievementsPage from "@/pages/social-achievements-page";
import SubscriptionRenewalPage from "@/pages/subscription-renewal-page";
import FeedbackPage from "@/pages/feedback-page";
import EmailManagementPage from "@/pages/email-management-page";
import PasswordResetRequestPage from "@/pages/password-reset-request-page";
import PasswordResetPage from "@/pages/password-reset-page";
import PlayerAnalyticsPage from "@/pages/player-analytics-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/tournaments" component={TournamentsPage} />
      <ProtectedRoute path="/tournaments/:id" component={TournamentDetailPage} />
      <ProtectedRoute path="/tournaments/:id/settings" component={TournamentSettingsPage} />
      <ProtectedRoute path="/tournaments/:id/edit" component={TournamentsPage} />
      <ProtectedRoute path="/players" component={PlayersPage} />
      <ProtectedRoute path="/players/:playerId/analytics" component={EnhancedPlayerProfilePage} />
      <ProtectedRoute path="/players/:playerId" component={PlayerProfilePage} />
      <ProtectedRoute path="/teams" component={TeamsPage} />
      <ProtectedRoute path="/teams/:teamId" component={TeamManagementPage} />
      <ProtectedRoute path="/leaderboards" component={LeaderboardsPage} />
      <ProtectedRoute path="/formula-builder" component={SimpleFormulaBuilder} />
      <ProtectedRoute path="/raw-data/:tournamentId" component={RawDataPage} />
      <ProtectedRoute path="/mobile" component={MobileRecordPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/settings/subscription-renewal" component={SubscriptionRenewalPage} />
      <ProtectedRoute path="/subscription-renewal" component={SubscriptionRenewalPage} />
      <ProtectedRoute path="/app-admin" component={AppAdminPage} />
      <ProtectedRoute path="/global-controls" component={GlobalControlsPage} />
      <ProtectedRoute path="/notifications" component={NotificationCenterPage} />
      <ProtectedRoute path="/achievements" component={SocialAchievementsPage} />
      <ProtectedRoute path="/feedback" component={FeedbackPage} />
      <ProtectedRoute path="/email-management" component={EmailManagementPage} />
      <ProtectedRoute path="/analytics" component={PlayerAnalyticsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/password-reset-request" component={PasswordResetRequestPage} />
      <Route path="/password-reset" component={PasswordResetPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
