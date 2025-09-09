import { Button, Stack } from '@mui/material';
import Page from '../../components/Page';

export default function DonorManagement() {
  return (
    <Page title="Donor Management">
      <Stack spacing={2}>
        <div>List/add/edit/delete donors coming soon.</div>
        <Button variant="contained">Add Donor</Button>
      </Stack>
    </Page>
  );
}

