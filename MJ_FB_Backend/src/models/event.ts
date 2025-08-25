export interface Event {
  id: number;
  title: string;
  details: string | null;
  category: string | null;
  date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}
