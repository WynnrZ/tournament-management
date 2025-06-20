import { Resend } from 'resend';
import {
  PlayerOfTheMonthData,
  SubscriptionReceiptData,
  UpcomingGameData,
  WelcomeEmailData,
  TournamentAnnouncementData,
  PasswordResetData,
  emailTemplates
} from './email-templates';

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class ResendEmailService {
  private resend: Resend;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.resend = new Resend(config.apiKey);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: [to],
        subject,
        html,
      });

      if (result.error) {
        console.error('Resend email error:', result.error);
        return false;
      }

      console.log('✅ Email sent successfully via Resend:', result.data?.id);
      return true;
    } catch (error) {
      console.error('Resend email error:', error);
      return false;
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

  async sendPasswordReset(to: string, data: PasswordResetData): Promise<boolean> {
    const template = emailTemplates.passwordReset(data);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendCustomEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.sendEmail(to, subject, html);
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const subject = "Test Email from WynnrZ";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Test Email Successful!</h2>
        <p>This is a test email to verify that your Resend integration is working correctly.</p>
        <p>If you received this email, your email service is properly configured.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Sent from WynnrZ Tournament Management System
        </p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }
}

export function getResendEmailService(): ResendEmailService | null {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.FROM_NAME || 'WynnrZ';

    if (!apiKey) {
      console.log('⚠️  RESEND_API_KEY not configured, email service disabled');
      return null;
    }

    if (!apiKey.startsWith('re_')) {
      console.log('⚠️  Invalid Resend API key format (should start with "re_")');
      return null;
    }

    return new ResendEmailService({
      apiKey,
      fromEmail,
      fromName,
    });
  } catch (error) {
    console.error('Failed to initialize Resend email service:', error);
    return null;
  }
}