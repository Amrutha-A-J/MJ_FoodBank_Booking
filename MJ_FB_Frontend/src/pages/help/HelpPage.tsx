import { useState, useMemo, useEffect } from 'react';
import {
  TextField,
  Button,
  Stack,
  Box,
  Typography,
  List,
  ListItem,
} from '@mui/material';
import Page from '../../components/Page';
import { useAuth } from '../../hooks/useAuth';
import { getHelpContent, type HelpSection } from './content';
import resetCss from '../../reset.css?url';
import RoleTabs, { type RoleTabOption } from '../../components/RoleTabs';
import { useTranslation } from 'react-i18next';

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function HelpPage() {
  const { role, access } = useAuth();
  const { t, i18n } = useTranslation();

  const roles: string[] = [];
  if (role === 'shopper') roles.push('client');
  if (role === 'volunteer') roles.push('volunteer');
  if (role === 'agency') roles.push('agency');
  if (role === 'staff') {
    if (access.includes('admin'))
      roles.push('client', 'volunteer', 'agency', 'pantry', 'warehouse', 'admin');
    else {
      if (access.includes('pantry')) roles.push('pantry');
      if (access.includes('warehouse')) roles.push('warehouse');
    }
  }

  const [search, setSearch] = useState('');
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

  const helpContent = useMemo(() => getHelpContent(t), [t, i18n.language]);
  const tabs: RoleTabOption[] = useMemo(() => {
    const query = search.toLowerCase();
    return roles.map(r => {
      const sections: HelpSection[] =
        helpContent[r]?.filter(s => {
          const text = [
            s.title,
            s.body.description,
            ...(s.body.steps ?? []),
          ]
            .join(' ')
            .toLowerCase();
          return text.includes(query);
        }) ?? [];
      const content = (
        <>
          {sections.map(s => (
            <Box key={s.title} sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {s.title}
              </Typography>
              <Typography>{s.body.description}</Typography>
              {s.body.steps && (
                <List
                  component="ol"
                  sx={{ listStyleType: 'decimal', pl: 4 }}
                >
                  {s.body.steps.map(step => (
                    <ListItem key={step} sx={{ display: 'list-item', pl: 0 }}>
                      {step}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          ))}
          {!sections.length && (
            <Typography>{t('help.no_matching_topics')}</Typography>
          )}
        </>
      );
      return { label: roleLabel(r), content };
    });
  }, [roles, search, helpContent, t]);

  return (
    <Page
      title={t('help.title')}
      header={
        <Stack spacing={2} sx={{ mb: 2, '@media print': { display: 'none' } }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={t('help.search')}
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
              {t('help.print')}
            </Button>
          </Stack>
        </Stack>
      }
    >
      {roles.length > 1 ? tabs.length && <RoleTabs tabs={tabs} /> : tabs[0]?.content}
    </Page>
  );
}

