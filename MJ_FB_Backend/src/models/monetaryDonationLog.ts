export interface MonetaryDonationLog {
  id: number;
  donorId: number;
  amount: number;
  date: string; // ISO date string
  note?: string;
}
