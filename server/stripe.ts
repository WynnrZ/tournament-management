import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable must be set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const PRICING_PLANS = {
  monthly: {
    name: 'Monthly Plan',
    price: 999, // $9.99 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited tournaments',
      'Advanced leaderboards', 
      'Custom formulas',
      'Data export',
      'Email support'
    ]
  },
  annual: {
    name: 'Annual Plan',
    price: 9999, // $99.99 in cents
    currency: 'usd', 
    interval: 'year',
    features: [
      'Everything in Monthly',
      '2 months free',
      'Priority support',
      'Advanced analytics',
      'Custom branding'
    ]
  }
};

export async function createCheckoutSession(
  planId: string,
  playerId: string,
  playerEmail: string
): Promise<Stripe.Checkout.Session> {
  const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
  
  if (!plan) {
    throw new Error('Invalid plan ID');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: plan.currency,
          product_data: {
            name: plan.name,
            description: `WynnrZ Tournament Management - ${plan.name}`,
          },
          unit_amount: plan.price,
          recurring: {
            interval: plan.interval as any,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      planId,
      playerId,
    },
    customer_email: playerEmail,
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/settings?success=true`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/settings?canceled=true`,
    allow_promotion_codes: true,
  });

  return session;
}