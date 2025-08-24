import config from '../config';
import logger from './logger';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.smtpFromEmail) {
    logger.warn('SMTP email configuration is missing');
    return;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    await transporter.sendMail({
      from: {
        address: config.smtpFromEmail,
        name: config.smtpFromName || undefined,
      },
      to,
      subject,
      html: body,
    });
  } catch (error) {
    logger.error('Failed to send email:', error);
  }
}
