import { useState } from 'react';
import { Grid, TextField, Button, Box, Typography } from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { createAgency } from '../../api/agencies';

export default function AddAgency() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAgency(name, email, contactInfo || undefined);
      setSnackbar({ message: 'Agency created', severity: 'success' });
      setName('');
      setEmail('');
      setContactInfo('');
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to create agency',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Grid container justifyContent="center" alignItems="center" spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              An email invitation will be sent.
            </Typography>
            <TextField
              label="Contact Info"
              value={contactInfo}
              onChange={e => setContactInfo(e.target.value)}
              fullWidth
              margin="normal"
            />
            <Button type="submit" variant="contained" size="small" sx={{ mt: 2 }}>
              Add Agency
            </Button>
          </Box>
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </>
  );
}

