import { useState } from 'react';
import { TextField, Button, Stack, Box, Typography } from '@mui/material';
import Page from '../../components/Page';
import RoleTabs from '../../components/RoleTabs';
import { useAuth } from '../../hooks/useAuth';
import { helpContent } from './content';

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

  const [search, setSearch] = useState('');

  const renderSections = (r: string) => {
    const query = search.toLowerCase();
    const sections =
      helpContent[r]?.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.body.toLowerCase().includes(query),
      ) ?? [];
    return sections.length ? (
      sections.map(s => (
        <Box key={s.title} sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {s.title}
          </Typography>
          <Typography>{s.body}</Typography>
        </Box>
      ))
    ) : (
      <Typography>No matching topics.</Typography>
    );
  };

  const tabs = roles.map(r => ({ label: roleLabel(r), content: renderSections(r) }));

  return (
    <Page
      title="Help"
      header={
        <Stack spacing={2} sx={{ mb: 2, '@media print': { display: 'none' } }}>
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
      {roles.length > 1 ? tabs.length && <RoleTabs tabs={tabs} /> : tabs[0]?.content}
    </Page>
  );
}

