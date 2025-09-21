import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export interface MonetaryDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface MonetaryDonation {
  id: number;
  donorId: number;
  amount: number;
  date: string;
}

export interface MailListDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  amount: number;
}

export interface MailLists {
  '1-100': MailListDonor[];
  '101-500': MailListDonor[];
  '501-1000': MailListDonor[];
  '1001-10000': MailListDonor[];
  '10001-30000': MailListDonor[];
}

export interface DonorTestEmail {
  id: number;
  email: string;
}

export type MonetaryDonorMonthBucket =
  | '1-100'
  | '101-500'
  | '501-1000'
  | '1001-10000'
  | '10001-30000';

export interface MonetaryDonorInsightsWindow {
  startMonth: string;
  endMonth: string;
  months: number;
}

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

export interface MonetaryDonorTierTallies {
  month: string;
  tiers: Record<MonetaryDonorMonthBucket, { donorCount: number; totalAmount: number }>;
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

export interface MonetaryDonorGivingTiers {
  currentMonth: MonetaryDonorTierTallies;
  previousMonth: MonetaryDonorTierTallies;
}

export interface MonetaryDonorInsightsResponse {
  window: MonetaryDonorInsightsWindow;
  monthly: MonetaryDonorMonthlySummary[];
  ytd: MonetaryDonorYtdSummary;
  topDonors: MonetaryDonorTopDonor[];
  givingTiers: MonetaryDonorGivingTiers;
  firstTimeDonors: MonetaryDonorFirstTimeDonor[];
  pantryImpact: MonetaryDonorPantryImpact;
}

export async function getMonetaryDonors(
  search?: string,
): Promise<MonetaryDonor[]> {
  const res = await apiFetch(
    search
      ? `${API_BASE}/monetary-donors?search=${encodeURIComponent(search)}`
      : `${API_BASE}/monetary-donors`,
  );
  return handleResponse(res);
}

export async function getMonetaryDonorInsights(
  params?: { months?: number; endMonth?: string },
): Promise<MonetaryDonorInsightsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.months !== undefined) {
    searchParams.set('months', String(params.months));
  }
  if (params?.endMonth) {
    searchParams.set('endMonth', params.endMonth);
  }
  const query = searchParams.toString();
  const url = query
    ? `${API_BASE}/monetary-donors/insights?${query}`
    : `${API_BASE}/monetary-donors/insights`;
  const res = await apiFetch(url);
  return handleResponse(res);
}

export async function createMonetaryDonor(
  data: Pick<MonetaryDonor, 'firstName' | 'lastName' | 'email'>,
): Promise<MonetaryDonor> {
  const res = await jsonApiFetch(`${API_BASE}/monetary-donors`, {
    method: 'POST',
    body: data,
  });
  return handleResponse(res);
}

export async function updateMonetaryDonor(
  id: number,
  data: Pick<MonetaryDonor, 'firstName' | 'lastName' | 'email'>,
): Promise<MonetaryDonor> {
  const res = await jsonApiFetch(`${API_BASE}/monetary-donors/${id}`, {
    method: 'PUT',
    body: data,
  });
  return handleResponse(res);
}

export async function deleteMonetaryDonor(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/monetary-donors/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export interface MonetaryDonorDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  amount: number;
  lastDonationISO: string | null;
}

export async function getMonetaryDonor(
  id: number,
): Promise<MonetaryDonorDetail> {
  const res = await apiFetch(`${API_BASE}/monetary-donors/${id}`);
  return handleResponse(res);
}

export async function getMonetaryDonations(
  donorId: number,
): Promise<MonetaryDonation[]> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/${donorId}/donations`,
  );
  return handleResponse(res);
}

export async function createMonetaryDonation(
  donorId: number,
  data: Pick<MonetaryDonation, 'amount' | 'date'>,
): Promise<MonetaryDonation> {
  const res = await jsonApiFetch(
    `${API_BASE}/monetary-donors/${donorId}/donations`,
    {
      method: 'POST',
      body: data,
    },
  );
  return handleResponse(res);
}

export async function updateMonetaryDonation(
  donationId: number,
  data: Pick<MonetaryDonation, 'donorId' | 'amount' | 'date'>,
): Promise<MonetaryDonation> {
  const res = await jsonApiFetch(
    `${API_BASE}/monetary-donors/donations/${donationId}`,
    {
      method: 'PUT',
      body: data,
    },
  );
  return handleResponse(res);
}

export async function deleteMonetaryDonation(
  donationId: number,
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/donations/${donationId}`,
    {
      method: 'DELETE',
    },
  );
  await handleResponse(res);
}

export async function getMailLists(
  year: number,
  month: number,
): Promise<MailLists> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/mail-lists?year=${year}&month=${month}`,
  );
  return handleResponse(res);
}

export interface SendMailListParams {
  year: number;
  month: number;
}

export async function sendMailListEmails({
  year,
  month,
}: SendMailListParams): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/monetary-donors/mail-lists/send`, {
    method: 'POST',
    body: { year, month },
  });
  await handleResponse(res);
}

export async function sendTestMailListEmails({
  year,
  month,
}: SendMailListParams): Promise<void> {
  const res = await jsonApiFetch(`${API_BASE}/monetary-donors/mail-lists/test`, {
    method: 'POST',
    body: { year, month },
  });
  await handleResponse(res);
}

export async function getDonorTestEmails(): Promise<DonorTestEmail[]> {
  const res = await apiFetch(`${API_BASE}/monetary-donors/test-emails`);
  return handleResponse(res);
}

export async function createDonorTestEmail(email: string): Promise<DonorTestEmail> {
  const res = await jsonApiFetch(`${API_BASE}/monetary-donors/test-emails`, {
    method: 'POST',
    body: { email },
  });
  return handleResponse(res);
}

export async function updateDonorTestEmail(
  id: number,
  email: string,
): Promise<DonorTestEmail> {
  const res = await jsonApiFetch(`${API_BASE}/monetary-donors/test-emails/${id}`, {
    method: 'PUT',
    body: { email },
  });
  return handleResponse(res);
}

export async function deleteDonorTestEmail(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/monetary-donors/test-emails/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function importZeffyDonations(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_BASE}/monetary-donors/import`, {
    method: 'POST',
    body: formData,
  });
  await handleResponse(res);
}

