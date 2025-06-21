import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_51OQSEPKHIWr2lkY9TMejQgCNGJryyLMlu2DYVK070taRlHHTq5PD5Xdi3Ai9wdY9P2n1FYM3eMKHWG0wSmRgYXfc00TNw07yE2");

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "monthly",
    name: "Monthly Plan",
    price: 9.99,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited tournaments",
      "Advanced leaderboards",
      "Custom formulas",
      "Data export",
      "Email support"
    ]
  },
  {
    id: "annual",
    name: "Annual Plan", 
    price: 99.99,
    currency: "USD",
    interval: "year",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Priority support",
      "Advanced analytics",
      "Custom branding"
    ],
    popular: true,
    badge: "Best Value"
  }
];

export function SubscriptionUpgradeSection() {
  const { toast } = useToast();

  const createCheckoutSession = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout-session", { planId });
      return await response.json();
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (stripe && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment process",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string) => {
    createCheckoutSession.mutate(planId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">
          Unlock the full potential of WynnrZ with our premium subscription plans
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {PRICING_PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                {plan.badge}
              </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                {plan.popular ? (
                  <Crown className="h-8 w-8 text-yellow-500" />
                ) : (
                  <Star className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ${plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={createCheckoutSession.isPending}
                className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                {createCheckoutSession.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center space-y-2 text-sm text-muted-foreground">
        <p>🔒 Secure payment processing by Stripe</p>
        <p>💳 All major credit cards accepted</p>
        <p>🔄 Cancel anytime • 30-day money-back guarantee</p>
      </div>
    </div>
  );
}