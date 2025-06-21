import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Crown } from "lucide-react";
import { useLocation, Link } from "wouter";

export function SubscriptionStatusBanner() {
  const [, setLocation] = useLocation();

  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/my-status-debug"],
    refetchInterval: 5000, // Check every 5 seconds for testing
  });

  console.log("🔔 Banner subscription data:", subscriptionStatus);

  // Demo: Show different states for testing
  // Change this line to test different notification states:
  const demoState = 'warning'; // Options: 'expired', 'warning', 'none'
  
  if (!subscriptionStatus) {
    if (demoState === 'expired') {
      return (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-red-800 font-medium">
                Your free trial has expired
              </span>
              <Badge variant="destructive">Expired</Badge>
            </div>
            <Button 
              size="sm" 
              onClick={() => setLocation('/subscription/renewal')}
              className="bg-red-600 hover:bg-red-700"
            >
              Renew Now
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (demoState === 'warning') {
      return (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-amber-800">
                Your free trial expires in <span className="font-bold">5 days</span>
              </span>
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                Trial Ending
              </Badge>
            </div>
            <Button 
              size="sm" 
              onClick={() => setLocation('/subscription/renewal')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    return null; // No notification for 'none' state
  }

  // Don't show banner if subscription is not expiring soon
  if (!subscriptionStatus.needsWarning && !subscriptionStatus.isExpired) {
    return null;
  }

  const isExpired = subscriptionStatus.isExpired;
  const isTrialExpiring = subscriptionStatus.subscriptionStatus === 'trial';

  if (isExpired) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-red-800 font-medium">
              Your {isTrialExpiring ? 'free trial' : 'subscription'} has expired
            </span>
            <Badge variant="destructive">Expired</Badge>
          </div>
          <Link href="/subscription-renewal">
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700"
            >
              Renew Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="text-amber-800">
            Your {isTrialExpiring ? 'free trial' : 'subscription'} expires in{' '}
            <span className="font-bold">{subscriptionStatus.daysUntilExpiry} day{subscriptionStatus.daysUntilExpiry === 1 ? '' : 's'}</span>
          </span>
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            {isTrialExpiring ? 'Trial Ending' : 'Expiring Soon'}
          </Badge>
        </div>
        <Link href="/subscription-renewal">
          <Button 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isTrialExpiring ? 'Upgrade Now' : 'Renew'}
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}