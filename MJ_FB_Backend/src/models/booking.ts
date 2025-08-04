interface Booking {
  id: number;
  status: string;
  date: string;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  slot_id: number | null;
  start_time: string | null;
  end_time: string | null;
}
