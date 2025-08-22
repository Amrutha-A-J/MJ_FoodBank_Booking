import config from '../config';
import logger from './logger';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // Skip sending if the URL is missing or still set to the placeholder value
  if (!config.powerAutomateUrl || config.powerAutomateUrl === 'your_flow_url') {
    logger.warn('POWER_AUTOMATE_URL is not configured');
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.powerAutomateKey) {
    headers['x-functions-key'] = config.powerAutomateKey;
  }

  try {
    const response = await fetch(config.powerAutomateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, subject, body }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`Failed to send email: ${response.status} ${text}`);
    }
  } catch (error) {
    logger.error('Failed to send email:', error);
  }
}
