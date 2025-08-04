export type Role = 'staff' | 'shopper' | 'delivery';
export type StaffRole = 'warehouse_lead' | 'pantry_lead' | 'volunteer_lead';

export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  available: number;
}
