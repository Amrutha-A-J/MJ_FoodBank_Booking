import { useEffect, useState } from 'react';
import {
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
import { getUserProfile, changePassword, updateMyProfile } from '../../api/users';
import { getVolunteerProfile } from '../../api/volunteers';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import PageContainer from '../../components/layout/PageContainer';
import PageCard from '../../components/layout/PageCard';

export default function Profile({ role }: { role: Role }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    document.title = 'MJ Foodbank - User Profile';
  }, []);

  useEffect(() => {
    const loader = role === 'volunteer' ? getVolunteerProfile : getUserProfile;
    loader()
      .then(p => {
        setProfile(p);
        setEmail(p.email ?? '');
        setPhone(p.phone ?? '');
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [role]);

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  function validatePassword(pwd: string) {
    if (pwd.length < 8) return 'Password must be at least 8 characters.';
    if (!/\d/.test(pwd)) return 'Password must include a number.';
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must include a symbol.';
    return '';
  }

  async function handleReset() {
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setSubmitting(true);
    setPasswordError('');
    try {
      await changePassword(currentPassword, newPassword);
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

  async function handleEdit() {
    if (!profile) return;
    if (editing) {
      setSaving(true);
      try {
        const updated = await updateMyProfile({ email, phone });
        setProfile(updated);
        setEmail(updated.email ?? '');
        setPhone(updated.phone ?? '');
        setToast({ open: true, message: 'Profile updated.', severity: 'success' });
        setEditing(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setToast({ open: true, message: msg, severity: 'error' });
      } finally {
        setSaving(false);
      }
    } else {
      setEditing(true);
    }
  }

  return (
    <PageContainer maxWidth="sm">
      <PageCard
        variant="elevation"
        elevation={0}
        sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}
        contentProps={{ sx: { p: 0 } }}
      >
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
          {!profile && !error && <Typography>Loading...</Typography>}
          {profile && (
            <Stack spacing={1}>
              <Typography>
                <strong>Name:</strong> {profile.firstName} {profile.lastName}
              </Typography>
              {profile.clientId !== undefined && (
                <Typography>
                  <strong>Client ID:</strong> {profile.clientId}
                </Typography>
              )}
              {profile.roles && profile.roles.length > 0 && (
                <Typography>
                  <strong>Roles:</strong> {profile.roles.join(', ')}
                </Typography>
              )}
              {profile.username && (
                <Typography>
                  <strong>Username:</strong> {profile.username}
                </Typography>
              )}
              {profile.trainedAreas && profile.trainedAreas.length > 0 && (
                <Typography>
                  <strong>Trained Areas:</strong> {profile.trainedAreas.join(', ')}
                </Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <TextField
                label="Email"
                size="small"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!editing}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Phone"
                size="small"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={!editing}
                InputLabelProps={{ shrink: true }}
              />
              {profile.bookingsThisMonth !== undefined && (
                <Typography>
                  <strong>Visits this month:</strong> {profile.bookingsThisMonth}
                </Typography>
              )}
            </Stack>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={saving ? <CircularProgress size={20} /> : <AccountCircle />}
            disabled={saving || !profile}
            onClick={handleEdit}
          >
            {editing ? 'Save' : 'Edit Profile'}
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
              onChange={e => {
                setCurrentPassword(e.target.value);
                setPasswordError('');
              }}
              disabled={submitting}
            />
            <TextField
              id="new-password"
              label="New Password"
              type="password"
              autoComplete="new-password"
              fullWidth
              value={newPassword}
              onChange={e => {
                const val = e.target.value;
                setNewPassword(val);
                setPasswordError(validatePassword(val));
              }}
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
              disabled={
                submitting ||
                !currentPassword ||
                !newPassword ||
                !!validatePassword(newPassword) ||
                !!passwordError
              }
              startIcon={submitting ? <CircularProgress size={20} /> : null}
              onClick={handleReset}
            >
              {submitting ? 'Updating…' : 'Reset Password'}
            </Button>
          </Stack>
        </Stack>
      </PageCard>

      <FeedbackSnackbar
        open={toast.open}
        onClose={() => setToast(s => ({ ...s, open: false }))}
        message={toast.message}
        severity={toast.severity}
      />
    </PageContainer>
  );
}
