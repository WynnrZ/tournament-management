import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface SubscriptionData {
  subscriptionStatus: string;
  subscriptionType: string | null;
  subscriptionValidUntil: string | null;
  isExpired: boolean;
  needsWarning: boolean;
  daysUntilExpiry: number | null;
}

export function SubscriptionDetailsCard() {
  const { user } = useAuth();

  const { data: subscriptionStatus } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/my-status-debug"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case "free_trial":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Free Trial</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="outline">N/A</Badge>;
    
    switch (type) {
      case "annual":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Annual</Badge>;
      case "monthly":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Monthly</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-medium">Subscription Details</h3>
        </div>
        <CardDescription>
          View your current subscription status and billing information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Subscription Status */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="font-medium">Status</span>
            </div>
            {getStatusBadge(subscriptionStatus?.subscriptionStatus ?? "free_trial")}
          </div>

          {/* Subscription Type */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Plan Type</span>
            </div>
            {getTypeBadge(subscriptionStatus?.subscriptionType)}
          </div>

          {/* Expiry Date */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">
                {subscriptionStatus?.subscriptionStatus === "free_trial" ? "Trial Expires" : "Renews On"}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {formatDate(subscriptionStatus?.subscriptionValidUntil)}
            </span>
          </div>

          {/* Days Until Expiry */}
          {subscriptionStatus?.daysUntilExpiry !== null && subscriptionStatus?.daysUntilExpiry !== undefined && (
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-medium">Days Remaining</span>
              <span className={`text-sm font-medium ${
                (subscriptionStatus?.daysUntilExpiry ?? 0) < 7 ? "text-red-600" : "text-gray-600"
              }`}>
                {(subscriptionStatus?.daysUntilExpiry ?? 0) > 0 
                  ? `${subscriptionStatus?.daysUntilExpiry} days` 
                  : "Expired"
                }
              </span>
            </div>
          )}

          {/* Account Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Account Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Username: <span className="font-medium">{user?.username}</span></div>
              <div>Email: <span className="font-medium">{user?.email}</span></div>
              <div>Member since: <span className="font-medium">
                {user?.createdAt ? formatDate(user.createdAt.toString()) : "N/A"}
              </span></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {subscriptionStatus?.subscriptionStatus === "free_trial" || 
             subscriptionStatus?.subscriptionStatus === "expired" ? (
              <Link href="/subscription-renewal">
                <Button className="flex-1">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Subscription
                </Button>
              </Link>
            ) : (
              <Link href="/subscription-renewal">
                <Button variant="outline" className="flex-1">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}