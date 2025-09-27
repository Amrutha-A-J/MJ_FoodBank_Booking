import { Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EntitySearch from '../../../components/EntitySearch';
import PageCard from '../../../components/layout/PageCard';
import type { VolunteerSearchResult } from '../../../api/volunteers';

export default function EditVolunteer() {
  const navigate = useNavigate();

  return (
    <PageCard>
      <Stack spacing={2}>
        <Typography variant="h5">Search Volunteers</Typography>
        <Typography variant="body2" color="text.secondary">
          Find a volunteer to open their profile, manage roles, and review stats.
        </Typography>
        <EntitySearch
          type="volunteer"
          placeholder="Search volunteer"
          onSelect={result => {
            const volunteer = result as VolunteerSearchResult;
            navigate(`/volunteer-management/volunteers/${volunteer.id}`);
          }}
          clearOnSelect
        />
      </Stack>
    </PageCard>
  );
}
