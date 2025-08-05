export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  role: 'staff' | 'volunteer_coordinator' | 'admin';
  email: string;
  password: string;
  is_admin: boolean;
}
