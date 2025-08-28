import { useState } from 'react';
import { createAgency } from '../../api/agencies';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { Box, Button, Stack, TextField } from '@mui/material';

export default function AddAgency() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!name || !email || !password) {
      setError('Name, email and password required');
      return;
    }
    try {
      await createAgency({
        name,
        email,
        password,
        contactInfo: contactInfo || undefined,
      });
      setSuccess('Agency created');
      setName('');
      setEmail('');
      setPassword('');
      setContactInfo('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Page title="Add Agency">
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box maxWidth={400} width="100%" mt={4}>
          <Stack spacing={2}>
            <TextField label="Name" value={name} onChange={e => setName(e.target.value)} />
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <TextField
              label="Contact Info (optional)"
              value={contactInfo}
              onChange={e => setContactInfo(e.target.value)}
            />
            <Button variant="contained" color="primary" size="small" onClick={submit}>
              Create Agency
            </Button>
          </Stack>
          <FeedbackSnackbar
            open={!!error}
            onClose={() => setError('')}
            message={error}
            severity="error"
          />
          <FeedbackSnackbar
            open={!!success}
            onClose={() => setSuccess('')}
            message={success}
            severity="success"
          />
        </Box>
      </Box>
    </Page>
  );
}
