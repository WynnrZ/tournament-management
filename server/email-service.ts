// import { MailService } from '@sendgrid/mail'; // Temporarily disabled

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private mailService: any; // Temporarily disabled
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    // Temporarily disabled to prevent JSON parsing errors
    this.mailService = null;
  }

  async sendTournamentNotification(
    recipient: string,
    playerName: string,
    subject: string,
    message: string
  ): Promise<boolean> {
    try {
      await this.mailService.send({
        to: recipient,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">WynnrZ</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #2d3748;">Hello ${playerName}!</h2>
              <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #4a5568;">${message}</p>
              </div>
            </div>
          </div>
        `,
        text: `Hello ${playerName}! ${message}`
      });

      return true;
    } catch (error) {
      console.error('Failed to send tournament notification:', error);
      return false;
    }
  }
}

export function getEmailService(): EmailService | null {
  // Temporarily disabled to prevent JSON parsing errors until proper API key is configured
  console.log('📧 Email service temporarily disabled - will re-enable when proper SendGrid API key is configured');
  return null;
  
  /* Commented out until proper SendGrid API key is available
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log('📧 SendGrid API key not configured, email notifications disabled');
    return null;
  }

  return new EmailService({
    apiKey,
    fromEmail: 'noreply@wynnrz.com',
    fromName: 'WynnrZ Tournament Platform'
  });
  */
}