import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export function SubscriptionInfoCard() {
  const [, setLocation] = useLocation();

  const { data: subscriptionStatus, isLoading } = useQuery({
    queryKey: ["/api/subscription/my-status"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionStatus) return null;

  const isExpired = subscriptionStatus.isExpired;
  const isTrial = subscriptionStatus.subscriptionStatus === 'trial';
  const needsAttention = subscriptionStatus.needsWarning || isExpired;

  const getStatusIcon = () => {
    if (isExpired) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (needsAttention) return <Clock className="h-5 w-5 text-amber-500" />;
    if (isTrial) return <Crown className="h-5 w-5 text-blue-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    if (needsAttention) return <Badge variant="outline" className="border-amber-300 text-amber-700">Expiring Soon</Badge>;
    if (isTrial) return <Badge variant="secondary">Free Trial</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getExpiryDate = () => {
    if (isTrial && subscriptionStatus.trialEndDate) {
      return new Date(subscriptionStatus.trialEndDate);
    }
    if (subscriptionStatus.subscriptionEndDate) {
      return new Date(subscriptionStatus.subscriptionEndDate);
    }
    return null;
  };

  const expiryDate = getExpiryDate();

  return (
    <Card className={needsAttention ? "border-amber-200 bg-amber-50" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Subscription Status
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Type:</span>
            <p className="font-medium capitalize">
              {isTrial ? 'Free Trial' : subscriptionStatus.subscriptionStatus}
            </p>
          </div>
          
          {expiryDate && (
            <div>
              <span className="text-gray-600">
                {isTrial ? 'Trial Ends:' : 'Expires:'}
              </span>
              <p className="font-medium">
                {format(expiryDate, 'MMM dd, yyyy')}
              </p>
            </div>
          )}

          {!isExpired && subscriptionStatus.daysUntilExpiry !== -1 && (
            <div>
              <span className="text-gray-600">Days Remaining:</span>
              <p className={`font-medium ${needsAttention ? 'text-amber-600' : 'text-green-600'}`}>
                {subscriptionStatus.daysUntilExpiry}
              </p>
            </div>
          )}
        </div>

        {(needsAttention || isExpired) && (
          <div className="pt-2 border-t">
            {isExpired ? (
              <div className="text-center">
                <p className="text-red-700 font-medium mb-3">
                  Your {isTrial ? 'trial' : 'subscription'} has expired. Renew to continue accessing all features.
                </p>
                <Button 
                  onClick={() => setLocation('/settings')}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Renew Subscription
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-amber-700 mb-3">
                  {isTrial 
                    ? `Your free trial ends in ${subscriptionStatus.daysUntilExpiry} days. Upgrade to continue enjoying premium features.`
                    : `Your subscription expires in ${subscriptionStatus.daysUntilExpiry} days.`
                  }
                </p>
                <Button 
                  onClick={() => setLocation('/settings')}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isTrial ? 'Upgrade Now' : 'Renew Subscription'}
                </Button>
              </div>
            )}
          </div>
        )}

        {isTrial && !needsAttention && !isExpired && (
          <div className="text-center pt-2 border-t">
            <p className="text-blue-700 text-sm mb-2">
              Enjoying your trial? Upgrade for continued access to all features.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/settings')}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              View Upgrade Options
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}