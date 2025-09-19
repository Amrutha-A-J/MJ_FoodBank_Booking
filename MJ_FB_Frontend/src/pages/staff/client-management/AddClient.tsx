import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addUser } from '../../../api/users';
import type { UserRole } from '../../../types';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import FeedbackModal from '../../../components/FeedbackModal';
import { Box, Button, Stack, TextField, MenuItem, Typography } from '@mui/material';
import OnlineAccessControls from '../../../components/OnlineAccessControls';
import ContactInfoFields from '../../../components/ContactInfoFields';

export default function AddClient() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('shopper');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientId, setClientId] = useState('');
  const [onlineAccess, setOnlineAccess] = useState(false);
  const [sendPasswordLink, setSendPasswordLink] = useState(true);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const id = searchParams.get('clientId');
    setClientId(id ?? '');
  }, [searchParams]);

  async function submitUser() {
    if (onlineAccess) {
      if (!firstName || !lastName || !clientId || !email) {
        setError('First name, last name, client ID and email required');
        return;
      }
      if (!sendPasswordLink && !password) {
        setError('Password required');
        return;
      }
    } else if (!clientId) {
      setError('Client ID required');
      return;
    }
    try {
      await addUser(clientId, role, onlineAccess, {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        password: sendPasswordLink ? undefined : password || undefined,
        sendPasswordLink,
      });
      setSuccess('Client added successfully');
      setFirstName('');
      setLastName('');
      setClientId('');
      setEmail('');
      setPhone('');
      setOnlineAccess(false);
      setSendPasswordLink(true);
      setPassword('');
      setRole('shopper');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Create Client
      </Typography>
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box maxWidth={400} width="100%" mt={4}>
          <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
          <FeedbackModal open={!!success} onClose={() => setSuccess('')} message={success} />
          <Stack spacing={2}>
          <OnlineAccessControls
            onlineAccess={onlineAccess}
            onOnlineAccessChange={setOnlineAccess}
            sendPasswordLink={sendPasswordLink}
            onSendPasswordLinkChange={setSendPasswordLink}
            password={password}
            onPasswordChange={setPassword}
          />
          <TextField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <TextField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <TextField label="Client ID" value={clientId} onChange={e => setClientId(e.target.value)} />
          <ContactInfoFields
            onlineAccess={onlineAccess}
            email={email}
            onEmailChange={setEmail}
            phone={phone}
            onPhoneChange={setPhone}
          />
          <TextField select label="Role" value={role} onChange={e => setRole(e.target.value as UserRole)}>
            <MenuItem value="shopper">Shopper</MenuItem>
            <MenuItem value="delivery">Delivery</MenuItem>
          </TextField>
          <Button variant="contained" color="primary" onClick={submitUser}>
            Add Client
          </Button>
        </Stack>
        </Box>
      </Box>
    </Box>
  );
}

