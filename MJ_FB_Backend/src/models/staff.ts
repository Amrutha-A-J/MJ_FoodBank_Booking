export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  role: 'warehouse_lead' | 'pantry_lead' | 'volunteer_lead';
  is_admin: boolean;
}
