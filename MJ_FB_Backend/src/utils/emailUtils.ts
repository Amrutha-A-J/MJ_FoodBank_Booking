import config from '../config';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!config.powerAutomateUrl) {
    console.warn('POWER_AUTOMATE_URL is not configured');
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.powerAutomateKey) {
    headers['x-functions-key'] = config.powerAutomateKey;
  }

  const response = await fetch(config.powerAutomateUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, subject, body }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to send email: ${response.status} ${text}`);
    throw new Error('Failed to send email');
  }
}
