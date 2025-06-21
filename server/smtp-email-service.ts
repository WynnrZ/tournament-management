import nodemailer from 'nodemailer';
import {
  PlayerOfTheMonthData,
  SubscriptionReceiptData,
  UpcomingGameData,
  WelcomeEmailData,
  TournamentAnnouncementData,
  emailTemplates
} from './email-templates';

interface SMTPEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromEmail: string;
  fromName: string;
}

export class SMTPEmailService {
  private transporter: nodemailer.Transporter;
  private config: SMTPEmailConfig;

  constructor(config: SMTPEmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
      });

      console.log('✅ Email sent successfully via SMTP:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ SMTP email error:', error);
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

  async sendCustomEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.sendEmail(to, subject, html);
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const subject = "Test Email from WynnrZ";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Test Email Successful!</h2>
        <p>This is a test email to verify that your SMTP email integration is working correctly.</p>
        <p>If you received this email, your email service is properly configured via Resend SMTP.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Sent from WynnrZ Tournament Management System
        </p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', error);
      return false;
    }
  }
}

export function getSMTPEmailService(): SMTPEmailService | null {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.FROM_NAME || 'WynnrZ';

    if (!apiKey) {
      console.log('⚠️  RESEND_API_KEY not configured for SMTP, email service disabled');
      return null;
    }

    return new SMTPEmailService({
      host: 'smtp.resend.com',
      port: 465,
      secure: true, // Use SSL/TLS
      auth: {
        user: 'resend',
        pass: apiKey, // Using API key as password
      },
      fromEmail,
      fromName,
    });
  } catch (error) {
    console.error('Failed to initialize SMTP email service:', error);
    return null;
  }
}