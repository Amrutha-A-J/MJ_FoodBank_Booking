export type StaffRole = 'staff';

export type StaffAccess = 'admin';

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  role: StaffRole;
  email: string;
  password: string;
  access: StaffAccess[];
}
