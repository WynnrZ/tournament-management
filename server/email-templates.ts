export interface PlayerOfTheMonthData {
  playerName: string;
  tournamentName: string;
  month: string;
  year: string;
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalPoints: number;
    rank: number;
  };
  achievements: string[];
  topOpponents: Array<{
    name: string;
    record: string;
  }>;
}

export interface SubscriptionReceiptData {
  playerName: string;
  email: string;
  subscriptionType: 'monthly' | 'annual';
  amount: string;
  currency: string;
  paymentDate: string;
  nextBillingDate: string;
  transactionId: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
}

export interface UpcomingGameData {
  playerName: string;
  tournamentName: string;
  gameDate: string;
  gameTime: string;
  opponent: string;
  venue?: string;
  gameType: string;
  round?: string;
  matchupHistory?: {
    wins: number;
    losses: number;
    lastPlayed: string;
  };
}

export interface WelcomeEmailData {
  playerName: string;
  username: string;
  tournamentName?: string;
  loginUrl: string;
  supportEmail: string;
}

export interface TournamentAnnouncementData {
  playerName: string;
  tournamentName: string;
  startDate: string;
  endDate?: string;
  gameType: string;
  registrationDeadline?: string;
  prizePool?: string;
  description: string;
}

export interface PasswordResetData {
  playerName: string;
  resetLink: string;
  expirationTime: string;
  ipAddress?: string;
  userAgent?: string;
}

export const emailTemplates = {
  playerOfTheMonth: (data: PlayerOfTheMonthData): { subject: string; html: string } => ({
    subject: `🏆 Congratulations! You're Player of the Month for ${data.month} ${data.year}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Player of the Month</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .trophy { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px; }
        .achievement-badge { background: linear-gradient(135deg, #ffd700, #ffed4a); color: #333; padding: 15px; border-radius: 10px; text-align: center; margin: 20px 0; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-number { font-size: 24px; font-weight: bold; color: #4338ca; }
        .achievements { background: #ecfdf5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10b981; }
        .opponents-list { background: #fef7ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; margin: 10px 0; }
        @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } .container { margin: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="trophy">🏆</div>
            <h1 style="margin: 0; font-size: 28px;">Player of the Month</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${data.month} ${data.year}</p>
        </div>
        
        <div class="content">
            <div class="achievement-badge">
                <h2 style="margin: 0; font-size: 24px;">Congratulations ${data.playerName}!</h2>
                <p style="margin: 10px 0 0 0;">Outstanding performance in ${data.tournamentName}</p>
            </div>
            
            <h3 style="color: #4338ca; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Your Exceptional Stats</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${data.stats.gamesPlayed}</div>
                    <div>Games Played</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${data.stats.wins}</div>
                    <div>Victories</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${data.stats.winRate}%</div>
                    <div>Win Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">#${data.stats.rank}</div>
                    <div>Current Rank</div>
                </div>
            </div>
            
            ${data.achievements.length > 0 ? `
            <div class="achievements">
                <h3 style="margin-top: 0; color: #059669;">🎯 Achievements Unlocked</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    ${data.achievements.map(achievement => `<li style="margin: 5px 0;">${achievement}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${data.topOpponents.length > 0 ? `
            <div class="opponents-list">
                <h3 style="margin-top: 0; color: #7c3aed;">⚔️ Top Matchups</h3>
                ${data.topOpponents.map(opponent => `
                    <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px; background: white; border-radius: 5px;">
                        <span>${opponent.name}</span>
                        <span style="font-weight: bold;">${opponent.record}</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="btn">View Full Leaderboard</a>
            </div>
        </div>
        
        <div class="footer">
            <h3 style="margin: 0 0 15px 0;">Keep Up the Excellence!</h3>
            <p style="margin: 0; opacity: 0.8;">Continue your winning streak and aim for back-to-back recognition.</p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.6;">
                WynnrZ Tournament Management • Elevating Competitive Excellence
            </p>
        </div>
    </div>
</body>
</html>
    `
  }),

  subscriptionReceipt: (data: SubscriptionReceiptData): { subject: string; html: string } => ({
    subject: `Receipt for Your ${data.subscriptionType === 'annual' ? 'Annual' : 'Monthly'} Subscription - Invoice #${data.invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Receipt</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .receipt-box { border: 2px solid #e2e8f0; border-radius: 10px; padding: 25px; margin: 20px 0; }
        .receipt-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
        .receipt-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; }
        .receipt-row.total { border-top: 2px solid #10b981; font-weight: bold; font-size: 18px; color: #10b981; }
        .company-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .next-billing { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; margin: 10px 0; }
        @media (max-width: 600px) { .receipt-row { flex-direction: column; } .container { margin: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Payment Successful</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your subscription renewal</p>
        </div>
        
        <div class="content">
            <h2 style="color: #10b981;">Hello ${data.playerName},</h2>
            <p>Your subscription has been successfully renewed. Here are your receipt details:</p>
            
            <div class="receipt-box">
                <div class="receipt-header">
                    <h3 style="margin: 0; color: #1f2937;">Invoice #${data.invoiceNumber}</h3>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Payment Date: ${data.paymentDate}</p>
                </div>
                
                <div class="receipt-row">
                    <span>Subscription Type:</span>
                    <span style="font-weight: bold; text-transform: capitalize;">${data.subscriptionType} Plan</span>
                </div>
                
                <div class="receipt-row">
                    <span>Billing Period:</span>
                    <span>${data.subscriptionType === 'annual' ? '12 Months' : '1 Month'}</span>
                </div>
                
                <div class="receipt-row">
                    <span>Payment Method:</span>
                    <span>Credit Card</span>
                </div>
                
                <div class="receipt-row">
                    <span>Transaction ID:</span>
                    <span style="font-family: monospace; font-size: 14px;">${data.transactionId}</span>
                </div>
                
                <div class="receipt-row total">
                    <span>Total Paid:</span>
                    <span>${data.currency} ${data.amount}</span>
                </div>
            </div>
            
            <div class="next-billing">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">📅 Next Billing Date</h4>
                <p style="margin: 0;">Your next ${data.subscriptionType} subscription will be charged on <strong>${data.nextBillingDate}</strong></p>
            </div>
            
            <div class="company-info">
                <h4 style="margin: 0 0 15px 0; color: #374151;">Bill To:</h4>
                <p style="margin: 0;"><strong>${data.playerName}</strong></p>
                <p style="margin: 5px 0;">${data.email}</p>
                
                <h4 style="margin: 20px 0 15px 0; color: #374151;">From:</h4>
                <p style="margin: 0;"><strong>${data.companyName}</strong></p>
                <p style="margin: 5px 0;">${data.companyAddress}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="btn">Manage Subscription</a>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #374151;">💡 What's Included in Your Subscription:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                    <li>Unlimited tournament participation</li>
                    <li>Advanced performance analytics</li>
                    <li>Priority customer support</li>
                    <li>Monthly achievement tracking</li>
                    <li>Social gaming features</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 15px 0;">Questions about your subscription?</p>
            <p style="margin: 0; opacity: 0.8;">Contact us at support@wynnrz.com</p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.6;">
                WynnrZ Tournament Management • Professional Gaming Excellence
            </p>
        </div>
    </div>
</body>
</html>
    `
  }),

  upcomingGame: (data: UpcomingGameData): { subject: string; html: string } => ({
    subject: `🎮 Upcoming Match: ${data.opponent} in ${data.tournamentName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upcoming Game</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .match-card { background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #7c3aed; border-radius: 15px; padding: 25px; margin: 20px 0; text-align: center; }
        .vs-section { display: flex; align-items: center; justify-content: center; margin: 20px 0; }
        .player { flex: 1; text-align: center; }
        .vs { margin: 0 20px; font-size: 24px; font-weight: bold; color: #7c3aed; }
        .match-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .detail-card { background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .history-card { background: #fef7ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #7c3aed; }
        .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; margin: 10px 0; }
        @media (max-width: 600px) { .vs-section { flex-direction: column; } .vs { margin: 10px 0; } .match-details { grid-template-columns: 1fr; } .container { margin: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎮 Game Day Approaching!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Get ready for your upcoming match</p>
        </div>
        
        <div class="content">
            <h2 style="color: #7c3aed;">Ready to compete, ${data.playerName}?</h2>
            <p>Your next challenge awaits in the <strong>${data.tournamentName}</strong> tournament.</p>
            
            <div class="match-card">
                <h3 style="margin: 0 0 20px 0; color: #7c3aed;">${data.gameType} Match</h3>
                
                <div class="vs-section">
                    <div class="player">
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">${data.playerName}</div>
                        <div style="color: #6b7280;">You</div>
                    </div>
                    <div class="vs">VS</div>
                    <div class="player">
                        <div style="font-size: 18px; font-weight: bold; color: #1f2937;">${data.opponent}</div>
                        <div style="color: #6b7280;">Opponent</div>
                    </div>
                </div>
                
                ${data.round ? `<div style="background: #7c3aed; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0;">${data.round}</div>` : ''}
            </div>
            
            <div class="match-details">
                <div class="detail-card">
                    <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">📅 Date</div>
                    <div style="margin-top: 5px;">${data.gameDate}</div>
                </div>
                <div class="detail-card">
                    <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">⏰ Time</div>
                    <div style="margin-top: 5px;">${data.gameTime}</div>
                </div>
                ${data.venue ? `
                <div class="detail-card" style="grid-column: 1 / -1;">
                    <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">📍 Venue</div>
                    <div style="margin-top: 5px;">${data.venue}</div>
                </div>
                ` : ''}
            </div>
            
            ${data.matchupHistory ? `
            <div class="history-card">
                <h4 style="margin: 0 0 15px 0; color: #7c3aed;">📊 Head-to-Head Record</h4>
                <div style="display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <div style="font-size: 20px; font-weight: bold; color: #10b981;">${data.matchupHistory.wins}</div>
                        <div style="color: #6b7280;">Your Wins</div>
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${data.matchupHistory.losses}</div>
                        <div style="color: #6b7280;">Their Wins</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; color: #6b7280;">Last Played</div>
                        <div style="font-weight: bold;">${data.matchupHistory.lastPlayed}</div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h4 style="margin: 0 0 10px 0; color: #059669;">💪 Pre-Game Tips</h4>
                <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li>Review your recent performance analytics</li>
                    <li>Check the tournament rules and scoring system</li>
                    <li>Arrive 15 minutes early for preparation</li>
                    <li>Stay hydrated and focused</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="btn">View Tournament Details</a>
            </div>
        </div>
        
        <div class="footer">
            <h3 style="margin: 0 0 15px 0;">Best of Luck!</h3>
            <p style="margin: 0; opacity: 0.8;">May the best player win. We'll be tracking your progress.</p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.6;">
                WynnrZ Tournament Management • Where Champions Are Made
            </p>
        </div>
    </div>
</body>
</html>
    `
  }),

  welcome: (data: WelcomeEmailData): { subject: string; html: string } => ({
    subject: `Welcome to WynnrZ - Your Competitive Gaming Journey Begins!`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WynnrZ</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; }
        .welcome-card { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px solid #3b82f6; border-radius: 15px; padding: 25px; margin: 20px 0; text-align: center; }
        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .feature { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .next-steps { background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; margin: 10px 0; }
        @media (max-width: 600px) { .features { grid-template-columns: 1fr; } .container { margin: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 32px;">Welcome to WynnrZ!</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Where Competitive Excellence Begins</p>
        </div>
        
        <div class="content">
            <div class="welcome-card">
                <h2 style="margin: 0 0 15px 0; color: #1d4ed8;">Hello ${data.playerName}! 🎉</h2>
                <p style="margin: 0; font-size: 16px;">Your account has been successfully created. You're now part of the premier tournament management platform.</p>
            </div>
            
            <h3 style="color: #1d4ed8; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Your Login Details</h3>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 0;"><strong>Username:</strong> ${data.username}</p>
                <p style="margin: 10px 0 0 0;"><strong>Login URL:</strong> <a href="${data.loginUrl}" style="color: #3b82f6;">${data.loginUrl}</a></p>
            </div>
            
            <h3 style="color: #1d4ed8; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">What You Can Do Now</h3>
            <div class="features">
                <div class="feature">
                    <div style="font-size: 24px; margin-bottom: 10px;">🏆</div>
                    <h4 style="margin: 0; color: #1f2937;">Join Tournaments</h4>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Participate in competitive events</p>
                </div>
                <div class="feature">
                    <div style="font-size: 24px; margin-bottom: 10px;">📊</div>
                    <h4 style="margin: 0; color: #1f2937;">Track Performance</h4>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Monitor your progress and stats</p>
                </div>
                <div class="feature">
                    <div style="font-size: 24px; margin-bottom: 10px;">🎯</div>
                    <h4 style="margin: 0; color: #1f2937;">Earn Achievements</h4>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Unlock badges and milestones</p>
                </div>
                <div class="feature">
                    <div style="font-size: 24px; margin-bottom: 10px;">👥</div>
                    <h4 style="margin: 0; color: #1f2937;">Social Gaming</h4>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Connect with other players</p>
                </div>
            </div>
            
            ${data.tournamentName ? `
            <div style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h4 style="margin: 0 0 10px 0; color: #059669;">🎮 You're Already Registered!</h4>
                <p style="margin: 0; color: #065f46;">You've been added to <strong>${data.tournamentName}</strong>. Check your dashboard for upcoming matches and tournament details.</p>
            </div>
            ` : ''}
            
            <div class="next-steps">
                <h4 style="margin: 0 0 15px 0; color: #92400e;">🚀 Next Steps</h4>
                <ol style="margin: 0; padding-left: 20px; color: #92400e;">
                    <li>Log in to your account using the link above</li>
                    <li>Complete your player profile</li>
                    <li>Browse available tournaments</li>
                    <li>Join your first competition</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" class="btn">Access Your Dashboard</a>
            </div>
        </div>
        
        <div class="footer">
            <h3 style="margin: 0 0 15px 0;">Need Help Getting Started?</h3>
            <p style="margin: 0 0 15px 0; opacity: 0.8;">Our support team is here to help you every step of the way.</p>
            <p style="margin: 0;">Contact us at <a href="mailto:${data.supportEmail}" style="color: #60a5fa;">${data.supportEmail}</a></p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.6;">
                WynnrZ Tournament Management • Elevating Your Game
            </p>
        </div>
    </div>
</body>
</html>
    `
  }),

  tournamentAnnouncement: (data: TournamentAnnouncementData): { subject: string; html: string } => ({
    subject: `🏆 New Tournament Alert: ${data.tournamentName} - Registration Open!`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tournament Announcement</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; }
        .tournament-card { background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 2px solid #dc2626; border-radius: 15px; padding: 25px; margin: 20px 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .detail-item { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .prize-highlight { background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
        .deadline-warning { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; margin: 10px 0; }
        @media (max-width: 600px) { .details-grid { grid-template-columns: 1fr; } .container { margin: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
            <h1 style="margin: 0; font-size: 28px;">New Tournament Announced!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Registration is now open</p>
        </div>
        
        <div class="content">
            <h2 style="color: #dc2626;">Hello ${data.playerName},</h2>
            <p>An exciting new tournament has been announced and we think you'd be perfect for it!</p>
            
            <div class="tournament-card">
                <h3 style="margin: 0 0 15px 0; font-size: 24px; color: #dc2626;">${data.tournamentName}</h3>
                <p style="margin: 0; color: #374151; line-height: 1.6;">${data.description}</p>
            </div>
            
            <h3 style="color: #dc2626; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Tournament Details</h3>
            <div class="details-grid">
                <div class="detail-item">
                    <div style="font-weight: bold; color: #dc2626;">🎮 Game Type</div>
                    <div style="margin-top: 5px;">${data.gameType}</div>
                </div>
                <div class="detail-item">
                    <div style="font-weight: bold; color: #dc2626;">📅 Start Date</div>
                    <div style="margin-top: 5px;">${data.startDate}</div>
                </div>
                ${data.endDate ? `
                <div class="detail-item">
                    <div style="font-weight: bold; color: #dc2626;">🏁 End Date</div>
                    <div style="margin-top: 5px;">${data.endDate}</div>
                </div>
                ` : ''}
                ${data.registrationDeadline ? `
                <div class="detail-item">
                    <div style="font-weight: bold; color: #dc2626;">⏰ Registration Deadline</div>
                    <div style="margin-top: 5px;">${data.registrationDeadline}</div>
                </div>
                ` : ''}
            </div>
            
            ${data.prizePool ? `
            <div class="prize-highlight">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">💰 Prize Pool</h4>
                <div style="font-size: 24px; font-weight: bold; color: #92400e;">${data.prizePool}</div>
            </div>
            ` : ''}
            
            ${data.registrationDeadline ? `
            <div class="deadline-warning">
                <div style="font-weight: bold; color: #dc2626;">⚠️ Registration Deadline</div>
                <div style="margin-top: 5px; color: #374151;">Don't miss out! Register before <strong>${data.registrationDeadline}</strong></div>
            </div>
            ` : ''}
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h4 style="margin: 0 0 10px 0; color: #1e40af;">🎯 Why You Should Join</h4>
                <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                    <li>Compete against skilled players at your level</li>
                    <li>Improve your ranking and earn achievements</li>
                    <li>Build your competitive gaming profile</li>
                    <li>Connect with the gaming community</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="btn">Register Now</a>
            </div>
        </div>
        
        <div class="footer">
            <h3 style="margin: 0 0 15px 0;">Ready to Compete?</h3>
            <p style="margin: 0; opacity: 0.8;">Join the tournament and show everyone what you're made of!</p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.6;">
                WynnrZ Tournament Management • Competitive Gaming Elevated
            </p>
        </div>
    </div>
</body>
</html>
    `
  }),

  passwordReset: (data: PasswordResetData): { subject: string; html: string } => ({
    subject: `🔐 Reset Your WynnrZ Password`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; }
        .reset-card { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #3b82f6; border-radius: 15px; padding: 25px; margin: 20px 0; text-align: center; }
        .security-info { background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
        .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; margin: 15px 0; font-weight: bold; }
        .btn:hover { background: linear-gradient(135deg, #1d4ed8, #1e40af); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Secure access to your account</p>
        </div>
        
        <div class="content">
            <h2 style="color: #3b82f6;">Hello ${data.playerName},</h2>
            <p>We received a request to reset your password for your WynnrZ account. Click the button below to create a new password:</p>
            
            <div class="reset-card">
                <h3 style="margin: 0 0 15px 0; color: #1d4ed8;">🎯 Reset Your Password</h3>
                <p style="margin: 0 0 20px 0; color: #374151;">Click the button below to securely reset your password</p>
                <a href="${data.resetLink}" class="btn">Reset Password</a>
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #6b7280;">This link expires in ${data.expirationTime}</p>
            </div>
            
            <div class="security-info">
                <h4 style="margin: 0 0 10px 0; color: #dc2626;">🛡️ Security Information</h4>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    <li>This request was made from IP: ${data.ipAddress || 'Unknown'}</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your password won't change until you click the link above</li>
                    <li>For security, this link will expire in ${data.expirationTime}</li>
                </ul>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; color: #1e40af;"><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
                <p style="margin: 10px 0 0 0; word-break: break-all; color: #3b82f6; font-family: monospace;">${data.resetLink}</p>
            </div>
        </div>
        
        <div class="footer">
            <h3 style="margin: 0 0 15px 0;">Need Help?</h3>
            <p style="margin: 0 0 15px 0; opacity: 0.8;">If you're having trouble resetting your password, contact our support team.</p>
            <p style="margin: 0;">Email us at <a href="mailto:support@wynnrz.com" style="color: #60a5fa;">support@wynnrz.com</a></p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.6;">
                WynnrZ Tournament Management • Secure Gaming Excellence
            </p>
        </div>
    </div>
</body>
</html>
    `
  })
};