import { MailService } from '@sendgrid/mail';
import { emailTemplates, PlayerOfTheMonthData, SubscriptionReceiptData, UpcomingGameData, WelcomeEmailData, TournamentAnnouncementData } from './email-templates';
import { getFallbackEmailService } from './fallback-email-service';

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class ProfessionalEmailService {
  private mailService: MailService;
  private config: EmailConfig;
  private fallbackService: any;

  constructor(config: EmailConfig) {
    this.config = config;
    this.mailService = new MailService();
    this.mailService.setApiKey(config.apiKey);
    this.fallbackService = getFallbackEmailService();
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // Validate API key format - SendGrid now uses SK. prefix
      if (!this.config.apiKey || (!this.config.apiKey.startsWith('SG.') && !this.config.apiKey.startsWith('SK.'))) {
        console.log('📧 SendGrid API key invalid, using fallback email logging service');
        return await this.fallbackService.sendCustomEmail(to, subject, html);
      }

      await this.mailService.send({
        to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        subject,
        html
      });
      
      console.log(`📧 Professional email sent successfully to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error('📧 SendGrid failed, falling back to email logging:', error);
      return await this.fallbackService.sendCustomEmail(to, subject, html);
    }
  }

  async sendPlayerOfTheMonth(to: string, data: PlayerOfTheMonthData): Promise<boolean> {
    const template = emailTemplates.playerOfTheMonth(data);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendSubscriptionReceipt(to: string, data: SubscriptionReceiptData): Promise<boolean> {
    const template = emailTemplates.subscriptionReceipt(data);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendUpcomingGame(to: string, data: UpcomingGameData): Promise<boolean> {
    const template = emailTemplates.upcomingGame(data);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendWelcome(to: string, data: WelcomeEmailData): Promise<boolean> {
    const template = emailTemplates.welcome(data);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendTournamentAnnouncement(to: string, data: TournamentAnnouncementData): Promise<boolean> {
    const template = emailTemplates.tournamentAnnouncement(data);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendCustomEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.sendEmail(to, subject, html);
  }

  // Test method to validate email service
  async sendTestEmail(to: string): Promise<boolean> {
    const subject = 'WynnrZ Email Service Test';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Test</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #3b82f6; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Service Test Successful!</h1>
        </div>
        <p>Your WynnrZ professional email service is working correctly.</p>
        <p>All email templates are ready for use:</p>
        <ul>
            <li>Player of the Month awards</li>
            <li>Subscription receipts</li>
            <li>Upcoming game notifications</li>
            <li>Welcome messages</li>
            <li>Tournament announcements</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            WynnrZ Tournament Management • Professional Gaming Excellence
        </p>
    </div>
</body>
</html>
    `;
    
    return this.sendEmail(to, subject, html);
  }
}

export function getProfessionalEmailService(): ProfessionalEmailService | null {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log('📧 SendGrid API key not found, professional email service disabled');
      return null;
    }

    return new ProfessionalEmailService({
      apiKey,
      fromEmail: 'onboarding@resend.dev',
      fromName: 'WynnrZ Tournament Management'
    });
  } catch (error) {
    console.error('📧 Failed to initialize professional email service:', error);
    return null;
  }
}