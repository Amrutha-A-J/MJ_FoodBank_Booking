export type Role = 'staff' | 'shopper' | 'delivery';

export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  available: number;
}
