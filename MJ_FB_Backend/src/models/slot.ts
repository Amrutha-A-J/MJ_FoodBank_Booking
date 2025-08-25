export interface Slot {
  id: string;
  startTime: string; // e.g., "09:30"
  endTime: string;   // e.g., "10:00"
  maxCapacity: number;
  available?: number;
  reason?: string;
  status?: 'blocked' | 'break';
}

