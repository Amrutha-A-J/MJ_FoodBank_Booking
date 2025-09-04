import { useEffect, useState, useCallback } from 'react';
import PantrySchedule from '../staff/PantrySchedule';
import Page from '../../components/Page';
import { getMyAgencyClients } from '../../api/agencies';
import { Stack, Typography } from '@mui/material';

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
        .slice(0, 5)
        .map(c => ({ client_id: c.id, name: c.name, email: c.email || '' }));
    },
    [clients],
  );

  return (
    <Page title="Agency Schedule">
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="body2">Select a green slot to book; gray slots are full.</Typography>
      </Stack>
      <PantrySchedule
        clientIds={clientIds}
        searchUsersFn={searchAgencyUsers}
      />
    </Page>
  );
}
