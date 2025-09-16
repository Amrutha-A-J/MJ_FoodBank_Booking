import { z } from 'zod';
import pool from '../db';

export interface DeliverySettings {
  requestEmail: string;
  monthlyOrderLimit: number;
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  requestEmail: 'amrutha.laxman@mjfoodbank.org',
  monthlyOrderLimit: 2,
};

const MIN_MONTHLY_ORDER_LIMIT = 1;
const MAX_MONTHLY_ORDER_LIMIT = 5;

const deliveryEnvSchema = z
  .object({
    DELIVERY_MONTHLY_ORDER_LIMIT: z
      .coerce.number({
        message: 'DELIVERY_MONTHLY_ORDER_LIMIT must be a number',
      })
      .int('DELIVERY_MONTHLY_ORDER_LIMIT must be a whole number')
      .min(
        MIN_MONTHLY_ORDER_LIMIT,
        `DELIVERY_MONTHLY_ORDER_LIMIT must be between ${MIN_MONTHLY_ORDER_LIMIT} and ${MAX_MONTHLY_ORDER_LIMIT}`,
      )
      .max(
        MAX_MONTHLY_ORDER_LIMIT,
        `DELIVERY_MONTHLY_ORDER_LIMIT must be between ${MIN_MONTHLY_ORDER_LIMIT} and ${MAX_MONTHLY_ORDER_LIMIT}`,
      )
      .default(DEFAULT_DELIVERY_SETTINGS.monthlyOrderLimit),
  })
  .transform(({ DELIVERY_MONTHLY_ORDER_LIMIT }) => ({
    monthlyOrderLimit: DELIVERY_MONTHLY_ORDER_LIMIT,
  }));

const envSettings = deliveryEnvSchema.parse(process.env);

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
    monthlyOrderLimit: envSettings.monthlyOrderLimit,
  };

  return cache;
}

export async function refreshDeliverySettings(): Promise<DeliverySettings> {
  cache = null;
  return getDeliverySettings();
}
