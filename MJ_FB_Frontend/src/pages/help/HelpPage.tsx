import { useState, useMemo, useEffect } from 'react';
import { Tabs, Tab, TextField, Button, Stack, Box, Typography } from '@mui/material';
import Page from '../../components/Page';
import { useAuth } from '../../hooks/useAuth';
import { helpContent, type HelpSection } from './content';
import resetCss from '../../reset.css?url';

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function HelpPage() {
  const { role, access } = useAuth();

  const roles: string[] = [];
  if (role === 'shopper') roles.push('client');
  if (role === 'volunteer') roles.push('volunteer');
  if (role === 'agency') roles.push('agency');
  if (role === 'staff') {
    if (access.includes('pantry')) roles.push('pantry');
    if (access.includes('warehouse')) roles.push('warehouse');
    if (access.includes('admin')) roles.push('admin');
  }

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const currentRole = roles[tab];

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resetCss;
    link.media = 'print';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const sections: HelpSection[] = useMemo(() => {
    const query = search.toLowerCase();
    return helpContent[currentRole]?.filter(
      s =>
        s.title.toLowerCase().includes(query) ||
        s.body.toLowerCase().includes(query),
    ) ?? [];
  }, [currentRole, search]);

  return (
    <Page
      title="Help"
      header={
        <Stack spacing={2} sx={{ mb: 2, '@media print': { display: 'none' } }}>
          {roles.length > 1 && (
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {roles.map(r => (
                <Tab key={r} label={roleLabel(r)} />
              ))}
            </Tabs>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              sx={{ '@media print': { display: 'none' } }}
            />
            <Button
              variant="outlined"
              onClick={() => window.print()}
              sx={{ '@media print': { display: 'none' } }}
            >
              Print
            </Button>
          </Stack>
        </Stack>
      }
    >
      {sections.map(s => (
        <Box key={s.title} sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {s.title}
          </Typography>
          <Typography>{s.body}</Typography>
        </Box>
      ))}
      {!sections.length && <Typography>No matching topics.</Typography>}
    </Page>
  );
}

