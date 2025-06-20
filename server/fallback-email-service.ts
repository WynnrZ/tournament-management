import { emailTemplates, PlayerOfTheMonthData, SubscriptionReceiptData, UpcomingGameData, WelcomeEmailData, TournamentAnnouncementData } from './email-templates';

interface EmailConfig {
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

interface EmailLog {
  to: string;
  subject: string;
  html: string;
  timestamp: string;
  status: 'logged' | 'queued';
}

export class FallbackEmailService {
  private config: EmailConfig;
  private emailQueue: EmailLog[] = [];

  constructor(config: EmailConfig) {
    this.config = config;
  }

  private async logEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const emailLog: EmailLog = {
        to,
        subject,
        html,
        timestamp: new Date().toISOString(),
        status: 'logged'
      };

      this.emailQueue.push(emailLog);
      
      console.log(`📧 [FALLBACK] Email logged for ${to}: ${subject}`);
      console.log(`📧 [FALLBACK] Total emails in queue: ${this.emailQueue.length}`);
      
      return true;
    } catch (error) {
      console.error('📧 Fallback Email Service Error:', error);
      return false;
    }
  }

  async sendPlayerOfTheMonth(to: string, data: PlayerOfTheMonthData): Promise<boolean> {
    const template = emailTemplates.playerOfTheMonth(data);
    return this.logEmail(to, template.subject, template.html);
  }

  async sendSubscriptionReceipt(to: string, data: SubscriptionReceiptData): Promise<boolean> {
    const template = emailTemplates.subscriptionReceipt(data);
    return this.logEmail(to, template.subject, template.html);
  }

  async sendUpcomingGame(to: string, data: UpcomingGameData): Promise<boolean> {
    const template = emailTemplates.upcomingGame(data);
    return this.logEmail(to, template.subject, template.html);
  }

  async sendWelcome(to: string, data: WelcomeEmailData): Promise<boolean> {
    const template = emailTemplates.welcome(data);
    return this.logEmail(to, template.subject, template.html);
  }

  async sendTournamentAnnouncement(to: string, data: TournamentAnnouncementData): Promise<boolean> {
    const template = emailTemplates.tournamentAnnouncement(data);
    return this.logEmail(to, template.subject, template.html);
  }

  async sendCustomEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.logEmail(to, subject, html);
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">WynnrZ Email Test</h2>
        <p>This is a test email from the WynnrZ tournament management system.</p>
        <p>If you receive this message, the email system is working correctly.</p>
        <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">
          Sent via Fallback Email Service at ${new Date().toISOString()}
        </p>
      </div>
    `;
    
    return this.logEmail(to, 'WynnrZ Email Test', testHtml);
  }

  // Method to get queued emails for admin review
  getEmailQueue(): EmailLog[] {
    return [...this.emailQueue];
  }

  // Method to clear the email queue
  clearEmailQueue(): void {
    this.emailQueue = [];
    console.log('📧 [FALLBACK] Email queue cleared');
  }

  // Method to export emails for external processing
  exportEmails(): string {
    return JSON.stringify(this.emailQueue, null, 2);
  }
}

export function getFallbackEmailService(): FallbackEmailService {
  return new FallbackEmailService({
    fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    fromName: process.env.FROM_NAME || 'WynnrZ Tournament System'
  });
}