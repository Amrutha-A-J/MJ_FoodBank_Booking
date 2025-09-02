import pool from '../db';

export interface OutboxEmail {
  recipient: string;
  subject: string;
  body: string;
}

export async function enqueueEmail({ recipient, subject, body }: OutboxEmail): Promise<void> {
  await pool.query(
    'INSERT INTO email_outbox (recipient, subject, body) VALUES ($1,$2,$3)',
    [recipient, subject, body],
  );
}
