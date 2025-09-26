import { Stack, Typography, ListItemButton, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EntitySearch from '../../../components/EntitySearch';
import PageCard from '../../../components/layout/PageCard';
import PageContainer from '../../../components/layout/PageContainer';
import type { VolunteerSearchResult } from '../../../api/volunteers';

export default function EditVolunteer() {
  const navigate = useNavigate();

  const handleSelect = (volunteer: VolunteerSearchResult) => {
    if (!volunteer?.id) return;
    navigate(`/volunteer-management/volunteers/${volunteer.id}`);
  };

  return (
    <PageContainer maxWidth="sm">
      <Stack spacing={3}>
        <Typography variant="h5">Edit Volunteer</Typography>
        <PageCard>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Search for a volunteer to view their profile and make updates.
            </Typography>
            <EntitySearch
              type="volunteer"
              placeholder="Search volunteer"
              onSelect={handleSelect}
              renderResult={(result, select) => (
                <ListItemButton
                  onClick={() => {
                    select();
                  }}
                >
                  <ListItemText
                    primary={result.name}
                    secondary={result.email || undefined}
                  />
                </ListItemButton>
              )}
              clearOnSelect
            />
          </Stack>
        </PageCard>
      </Stack>
    </PageContainer>
  );
}
