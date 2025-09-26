import { Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EntitySearch from '../../../components/EntitySearch';
import PageCard from '../../../components/layout/PageCard';
import type { VolunteerSearchResult } from '../../../api/volunteers';

export default function EditVolunteer() {
  const navigate = useNavigate();

  function handleSelect(result: VolunteerSearchResult) {
    navigate(`/volunteer-management/volunteers/${result.id}`);
  }

  return (
    <PageCard>
      <Stack spacing={2}>
        <Typography variant="h5">Search Volunteers</Typography>
        <Typography variant="body2" color="text.secondary">
          Find a volunteer to open their profile, manage roles, and review stats.
        </Typography>
        <EntitySearch<VolunteerSearchResult>
          type="volunteer"
          placeholder="Search volunteer"
          onSelect={handleSelect}
          clearOnSelect
        />
      </Stack>
    </PageCard>
  );
}
