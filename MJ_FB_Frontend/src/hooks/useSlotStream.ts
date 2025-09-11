import { useEffect } from 'react';
import { API_BASE } from '../api/client';

export interface SlotStreamMessage<T = unknown> {
  date?: string;
  slots?: T[];
}

export default function useSlotStream<T = unknown>(
  onMessage: (data: SlotStreamMessage<T>) => void,
) {
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(`${API_BASE}/bookings/stream`, {
      withCredentials: true,
    });
    es.onmessage = ev => {
      try {
        const data = JSON.parse(ev.data);
        onMessage(data);
      } catch {
        /* ignore */
      }
    };
    return () => {
      es.close();
    };
  }, [onMessage]);
}
