import { useEffect } from 'react';
import { API_BASE } from '../api/client';

export type SlotStreamMessage = any;

export default function useSlotStream(onMessage: (data: SlotStreamMessage) => void) {
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
