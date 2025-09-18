export type StaffRole = 'staff';

export type StaffAccess =
  | 'pantry'
  | 'volunteer_management'
  | 'warehouse'
  | 'admin'
  | 'donor_management'
  | 'payroll_management'
  | 'donation_entry';

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  role: StaffRole;
  email: string;
  password: string;
  access: StaffAccess[];
  consent: boolean;
}
