import pool from '../db';

export interface DeliverySettings {
  requestEmail: string;
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  requestEmail: 'amrutha.laxman@mjfoodbank.org',
};

let cache: DeliverySettings | null = null;

export async function getDeliverySettings(): Promise<DeliverySettings> {
  if (cache) {
    return cache;
  }

  const result = await pool.query(
    "SELECT value FROM app_config WHERE key = 'delivery_request_email'",
  );

  const email = result.rows[0]?.value?.trim();

  cache = {
    requestEmail: email || DEFAULT_DELIVERY_SETTINGS.requestEmail,
  };

  return cache;
}

export async function refreshDeliverySettings(): Promise<DeliverySettings> {
  cache = null;
  return getDeliverySettings();
}
