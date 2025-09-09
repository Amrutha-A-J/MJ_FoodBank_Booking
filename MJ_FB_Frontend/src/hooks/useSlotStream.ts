import { useEffect } from 'react';

export type SlotStreamMessage = any;

export default function useSlotStream(onMessage: (data: SlotStreamMessage) => void) {
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const base = process.env.VITE_API_BASE || '';
    const es = new EventSource(`${base}/bookings/stream`, {
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
