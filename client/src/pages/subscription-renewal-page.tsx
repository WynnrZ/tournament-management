import { useState, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

const RenewalForm = ({ subscriptionType, amount, currency, onCreatePaymentIntent }: { 
  subscriptionType: string; 
  amount: number; 
  currency: string;
  onCreatePaymentIntent: () => Promise<string>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔄 Starting payment confirmation...');
      
      // Create payment intent first
      const clientSecret = await onCreatePaymentIntent();
      
      // First submit the payment elements to get payment method
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        console.error('❌ Payment submission error:', submitError);
        toast({
          title: "Payment Failed",
          description: submitError.message,
          variant: "destructive",
        });
        return;
      }

      // Then confirm the payment
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/subscription/renewal?payment=success`,
        },
      });

      console.log('💳 Payment confirmation result:', result);

      if (result.error) {
        console.error('❌ Payment error:', result.error);
        toast({
          title: "Payment Failed",
          description: result.error.message,
          variant: "destructive",
        });
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        console.log('✅ Payment successful:', result.paymentIntent);
        
        // Complete the subscription renewal on the backend
        try {
          const completionResponse = await apiRequest("POST", "/api/subscription/complete-renewal", {
            paymentIntentId: result.paymentIntent.id,
            subscriptionType: subscriptionType
          });
          
          const completionData = await completionResponse.json();
          
          toast({
            title: "Subscription Renewed Successfully",
            description: `Your ${subscriptionType} subscription has been renewed until ${new Date(completionData.subscriptionEndDate).toLocaleDateString()}!`,
          });
          
          // Refresh subscription status after successful completion
          setTimeout(() => {
            window.location.href = "/settings?renewal=success";
          }, 2000);
        } catch (error) {
          console.error('Error completing subscription renewal:', error);
          toast({
            title: "Payment Processed",
            description: "Your payment was successful but there was an issue updating your subscription. Please contact support.",
            variant: "destructive",
          });
        }
      } else {
        console.log('⚠️ Payment requires additional action:', result.paymentIntent);
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. Please wait...",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Payment Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subscription Type:</span>
            <Badge variant="secondary">{subscriptionType}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-medium">
              {currency === 'USD' ? '$' : '£'}{amount.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      </div>

      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        size="lg"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Renew Subscription
          </div>
        )}
      </Button>
    </form>
  );
};

export default function SubscriptionRenewalPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get global pricing with fallback
  const { data: pricing, isLoading: pricingLoading } = useQuery({
    queryKey: ["/api/global-pricing"],
    select: (data: any) => data || { monthlyPriceEur: 0.45, annualPriceEur: 5.29 }
  });

  // Get current subscription status
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/my-status"],
    select: (data: any) => data || {}
  });

  const monthlyPrice = (pricing as any)?.monthlyPriceEur || 0.45;
  const annualPrice = (pricing as any)?.annualPriceEur || 5.29;

  // Create payment intent when user clicks pay button
  const createPaymentIntent = async () => {
    if (!selectedPlan || !pricing) return;
    
    const amount = selectedPlan === 'monthly' ? monthlyPrice : annualPrice;
    
    console.log("💰 Frontend pricing calculation:", {
      selectedPlan,
      monthlyPrice,
      annualPrice,
      calculatedAmount: amount,
      amountInCents: amount * 100
    });
    
    try {
      const response = await apiRequest("POST", "/api/subscription/create-renewal-intent", { 
        subscriptionType: selectedPlan,
        amount: amount * 100, // Convert to cents
        currency: 'EUR'
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
      return data.clientSecret;
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (!pricing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-center mb-8 relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0"
          onClick={() => setLocation("/settings")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Renew Your Subscription</h1>
          <p className="text-muted-foreground">
            Continue enjoying premium tournament management features
          </p>
        </div>
      </div>

      {subscriptionStatus && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={subscriptionStatus.subscriptionStatus === 'expired' ? 'destructive' : 'secondary'}>
                  {subscriptionStatus.subscriptionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="font-medium">
                  {subscriptionStatus.subscriptionEndDate 
                    ? new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card 
          className={`cursor-pointer transition-all ${
            selectedPlan === 'monthly' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => {
            setSelectedPlan('monthly');
            setClientSecret(''); // Clear existing client secret to force new payment intent
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Plan</CardTitle>
              <CheckCircle className={`h-5 w-5 ${
                selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <CardDescription>
              Flexible monthly billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              €{pricing.monthlyPriceEur}
              <span className="text-lg text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Cancel anytime
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            selectedPlan === 'annual' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => {
            setSelectedPlan('annual');
            setClientSecret(''); // Clear existing client secret to force new payment intent
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Annual Plan</CardTitle>
              <CheckCircle className={`h-5 w-5 ${
                selectedPlan === 'annual' ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <CardDescription>
              Save with yearly billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              €{pricing.annualPriceEur}
              <span className="text-lg text-muted-foreground">/year</span>
            </div>
            <div className="text-sm text-green-600 font-medium">
              Save €{((pricing.monthlyPriceEur || 0) * 12 - (pricing.annualPriceEur || 0)).toFixed(2)} per year
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Complete Payment
          </CardTitle>
          <CardDescription>
            Secure payment processing powered by Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ mode: 'payment', currency: 'eur', amount: (selectedPlan === 'monthly' ? monthlyPrice : annualPrice) * 100 }}>
            <RenewalForm 
              subscriptionType={selectedPlan}
              amount={Number(selectedPlan === 'monthly' ? pricing.monthlyPriceEur : pricing.annualPriceEur)}
              currency="EUR"
              onCreatePaymentIntent={createPaymentIntent}
            />
          </Elements>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          By renewing your subscription, you agree to our terms of service and privacy policy.
          Your subscription will auto-renew unless cancelled.
        </p>
      </div>
    </div>
  );
}