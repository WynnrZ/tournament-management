// Email service temporarily disabled to prevent JSON parsing errors

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async sendTournamentNotification(
    recipient: string,
    playerName: string,
    subject: string,
    message: string
  ): Promise<boolean> {
    console.log(`Email service disabled - would send to ${recipient}: ${subject}`);
    return false;
  }
}

export function getEmailService(): EmailService | null {
  console.log('Email service temporarily disabled - will re-enable when proper SendGrid API key is configured');
  return null;
}