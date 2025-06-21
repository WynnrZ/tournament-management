import { AlertTriangle, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function SubscriptionTestBanner() {
  const { data: subscriptionStatus, isLoading } = useQuery({
    queryKey: ["/api/subscription/my-status-debug"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 5000, // Force refresh every 5 seconds for testing
  });

  console.log("🔔 Test Banner - Raw Data:", subscriptionStatus);
  console.log("🔔 Test Banner - Loading:", isLoading);

  if (isLoading) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          Checking subscription status...
        </AlertDescription>
      </Alert>
    );
  }

  if (!subscriptionStatus) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription>
          No subscription data received. Debug mode active.
        </AlertDescription>
      </Alert>
    );
  }

  // Force show expired notification for testuser
  return (
    <Alert className="bg-red-50 border-red-200">
      <CreditCard className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>Trial Expired!</strong> Your trial ended 7 days ago. Subscribe to continue accessing tournaments.
        </span>
        <Button size="sm" className="ml-4">
          Subscribe Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}