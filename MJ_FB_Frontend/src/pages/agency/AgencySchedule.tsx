import { useEffect, useState, useCallback } from 'react';
import PantrySchedule from '../staff/PantrySchedule';
import { getMyAgencyClients } from '../../api/agencies';
import type { Role } from '../../types';

interface AgencyClient {
  id: number;
  name: string;
  email?: string;
}

export default function AgencySchedule() {
  const [clients, setClients] = useState<AgencyClient[]>([]);

  useEffect(() => {
    getMyAgencyClients()
      .then(data => {
        const mapped = Array.isArray(data)
          ? data.map((c: any) => ({
              id: c.id ?? c.client_id,
              name:
                c.name ??
                c.client_name ??
                `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
              email: c.email,
            }))
          : [];
        setClients(mapped);
      })
      .catch(() => setClients([]));
  }, []);

  const clientIds = clients.map(c => c.id);

  const searchAgencyUsers = useCallback(
    async (term: string) => {
      const lower = term.toLowerCase();
      return clients
        .filter(
          c =>
            c.name.toLowerCase().includes(lower) ||
            c.id.toString().includes(term),
        )
        .slice(0, 5);
    },
    [clients],
  );

  return (
    <PantrySchedule
      clientIds={clientIds}
      searchUsersFn={searchAgencyUsers}
    />
  );
}
