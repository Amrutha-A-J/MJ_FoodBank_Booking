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

export interface MonetaryDonorTopDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  windowAmount: number;
  lifetimeAmount: number;
  lastDonationISO: string | null;
}

export type MonetaryDonorTier =
  | '1-100'
  | '101-500'
  | '501-1000'
  | '1001-10000'
  | '10001-30000';

export interface MonetaryDonorTierTallies {
  month: string;
  tiers: Record<MonetaryDonorTier, { donorCount: number; totalAmount: number }>;
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

export interface MonetaryDonorInsightsResponse {
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

export interface MonetaryDonorInsightsParams {
  months?: number;
  endMonth?: string;
}

export async function getMonetaryDonorInsights(
  params: MonetaryDonorInsightsParams = {},
): Promise<MonetaryDonorInsightsResponse> {
  const searchParams = new URLSearchParams();
  if (typeof params.months === 'number') {
    searchParams.set('months', String(params.months));
  }
  if (typeof params.endMonth === 'string' && params.endMonth) {
    searchParams.set('endMonth', params.endMonth);
  }

  const query = searchParams.toString();
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/insights${query ? `?${query}` : ''}`,
  );
  return handleResponse(res);
}
