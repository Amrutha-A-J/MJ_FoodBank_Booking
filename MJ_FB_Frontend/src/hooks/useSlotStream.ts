import { useEffect, useState } from 'react';
import { API_BASE } from '../api/client';

export interface SlotStreamEvent {
  action: 'created' | 'cancelled';
  name: string;
  role: string;
  date: string;
  time: string;
}

export default function useSlotStream() {
  const [event, setEvent] = useState<SlotStreamEvent | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(`${API_BASE}/bookings/stream`, {
      withCredentials: true,
    });
    es.onopen = () => setError(false);
    es.onerror = () => setError(true);
    es.onmessage = (ev) => {
      try {
        setEvent(JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    };
    return () => {
      es.close();
    };
  }, [retry]);

  function reconnect() {
    setRetry((r) => r + 1);
  }

  return { event, error, reconnect };
}

