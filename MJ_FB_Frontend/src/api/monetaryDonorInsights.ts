import { API_BASE, apiFetch, handleResponse } from './client';

export interface MonetaryDonorMonthlySummary {
  month: string;
  totalAmount: number;
  donationCount: number;
  donorCount: number;
  averageGift: number;
}

export interface MonetaryDonorYtdSummary {
  totalAmount: number;
  donationCount: number;
  donorCount: number;
  averageGift: number;
  averageDonationsPerDonor: number;
  lastDonationISO: string | null;
}

export type MonetaryDonorTierBucket =
  | '1-100'
  | '101-500'
  | '501-1000'
  | '1001-10000'
  | '10001-30000';

export interface MonetaryDonorTierTallies {
  month: string;
  tiers: Record<MonetaryDonorTierBucket, { donorCount: number; totalAmount: number }>;
}

export interface MonetaryDonorTopDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  windowAmount: number;
  lifetimeAmount: number;
  lastDonationISO: string | null;
}

export interface MonetaryDonorFirstTimeDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  firstDonationISO: string;
  amount: number;
}

export interface MonetaryDonorPantryImpact {
  families: number;
  adults: number;
  children: number;
  pounds: number;
}

export interface MonetaryDonorInsights {
  window: {
    startMonth: string;
    endMonth: string;
    months: number;
  };
  monthly: MonetaryDonorMonthlySummary[];
  ytd: MonetaryDonorYtdSummary;
  topDonors: MonetaryDonorTopDonor[];
  givingTiers: {
    currentMonth: MonetaryDonorTierTallies;
    previousMonth: MonetaryDonorTierTallies;
  };
  firstTimeDonors: MonetaryDonorFirstTimeDonor[];
  pantryImpact: MonetaryDonorPantryImpact;
}

interface GetMonetaryDonorInsightsParams {
  months?: number;
  endMonth?: string;
}

export async function getMonetaryDonorInsights(
  params: GetMonetaryDonorInsightsParams = {},
): Promise<MonetaryDonorInsights> {
  const query = new URLSearchParams();
  if (typeof params.months === 'number') {
    query.set('months', String(params.months));
  }
  if (params.endMonth) {
    query.set('endMonth', params.endMonth);
  }
  const search = query.toString();
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/insights${search ? `?${search}` : ''}`,
  );
  return handleResponse(res);
}
