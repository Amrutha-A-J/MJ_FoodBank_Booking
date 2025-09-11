import pool from '../db';
import { Queryable } from './bookingUtils';

let cartTare: number | null = null;

export async function getCartTare(client: Queryable = pool): Promise<number> {
  if (cartTare === null) {
    const result = await client.query(
      "SELECT value FROM app_config WHERE key = 'cart_tare'",
    );
    cartTare = Number(result.rows[0]?.value ?? 0);
  }
  return cartTare;
}

export async function refreshCartTare(client: Queryable = pool): Promise<number> {
  cartTare = null;
  return getCartTare(client);
}

export function setCartTare(value: number | null) {
  cartTare = value;
}

