import React, { useEffect, useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Stack,
  Typography,
  Avatar,
  Divider,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { AccountCircle, Lock } from '@mui/icons-material';
import type { Role, UserProfile } from '../../types';
import { getUserProfile, changePassword } from '../../api/users';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';

export default function Profile({ token, role }: { token: string; role: Role }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    document.title = 'MJ Foodbank - User Profile';
  }, []);

  useEffect(() => {
    if (role === 'shopper') {
      getUserProfile(token)
        .then(setProfile)
        .catch(e => setError(e instanceof Error ? e.message : String(e)));
    }
  }, [role, token]);

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  async function handleReset() {
    setSubmitting(true);
    setPasswordError('');
    try {
      await changePassword(token, currentPassword, newPassword);
      setToast({ open: true, message: 'Password updated.', severity: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasswordError(msg);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Card elevation={0} sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                {initials || ' '}
              </Avatar>
              <Stack>
                <Typography variant="h4" fontWeight={700}>
                  User Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Home / Profile
                </Typography>
              </Stack>
            </Stack>

            {/* Profile info */}
            {error && <Typography color="error">{error}</Typography>}
            {role === 'shopper' && !profile && !error && <Typography>Loading...</Typography>}
            {role === 'shopper' && profile && (
              <Stack spacing={0.5}>
                <Typography>
                  <strong>Name:</strong> {profile.firstName} {profile.lastName}
                </Typography>
                <Typography>
                  <strong>Client ID:</strong> {profile.clientId}
                </Typography>
                <Typography color={profile.email ? undefined : 'text.secondary'}>
                  <strong>Email:</strong> {profile.email ?? 'N/A'}
                </Typography>
                <Typography color={profile.phone ? undefined : 'text.secondary'}>
                  <strong>Phone:</strong> {profile.phone ?? 'N/A'}
                </Typography>
                <Typography>
                  <strong>Visits this month:</strong> {profile.bookingsThisMonth}
                </Typography>
              </Stack>
            )}
            {role !== 'shopper' && !error && (
              <Typography color="text.secondary">No profile information available.</Typography>
            )}

            <Button variant="outlined" size="small" startIcon={<AccountCircle />}>
              Edit Profile
            </Button>

            <Divider sx={{ my: 1 }} />

            {/* Password reset */}
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Lock fontSize="small" />
                <Typography variant="h6">Reset Password</Typography>
              </Stack>

              <TextField
                id="current-password"
                label="Current Password"
                type="password"
                autoComplete="current-password"
                fullWidth
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                disabled={submitting}
              />
              <TextField
                id="new-password"
                label="New Password"
                type="password"
                autoComplete="new-password"
                fullWidth
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={submitting}
                error={!!passwordError}
                helperText={passwordError}
              />
              <Typography variant="caption" color="text.secondary">
                Use at least 8 characters, including a number and a symbol.
              </Typography>

              <Button
                variant="contained"
                color="success"
                size="small"
                fullWidth
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : null}
                onClick={handleReset}
              >
                {submitting ? 'Updating…' : 'Reset Password'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <FeedbackSnackbar
        open={toast.open}
        onClose={() => setToast(s => ({ ...s, open: false }))}
        message={toast.message}
        severity={toast.severity}
      />
    </Container>
  );
}

