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
import AccountCircle from '@mui/icons-material/AccountCircle';
import Lock from '@mui/icons-material/Lock';
import type { Role, UserProfile } from '../../types';
import { getUserProfile, changePassword, updateMyProfile } from '../../api/users';
import { getVolunteerProfile } from '../../api/volunteers';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import PageContainer from '../../components/layout/PageContainer';
import PageCard from '../../components/layout/PageCard';
import { useTranslation } from 'react-i18next';

export default function Profile({ role }: { role: Role }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    document.title = t('user_profile_document_title');
  }, [t]);

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
    ? profile.role === 'agency'
      ? (profile.firstName ?? '').slice(0, 2).toUpperCase()
      : `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '';
  const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

  function validatePassword(pwd: string) {
    if (pwd.length < 8) return t('password_min_length');
    if (!/\d/.test(pwd)) return t('password_require_number');
    if (!/[^A-Za-z0-9]/.test(pwd)) return t('password_require_symbol');
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
      setToast({ open: true, message: t('password_updated'), severity: 'success' });
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
      if (profile.role !== 'agency' && phone && phoneError) {
        setToast({ open: true, message: t('invalid_phone_number'), severity: 'error' });
        return;
      }
      setSaving(true);
      try {
        const updated = await updateMyProfile({ email, phone });
        setProfile(updated);
        setEmail(updated.email ?? '');
        setPhone(updated.phone ?? '');
        setToast({ open: true, message: t('profile_updated'), severity: 'success' });
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
                {t('user_profile')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('user_profile_breadcrumb')}
              </Typography>
            </Stack>
          </Stack>

          {/* Profile info */}
          {error && <Typography color="error">{error}</Typography>}
          {!profile && !error && <Typography>{t('loading')}</Typography>}
          {profile && (
            <Stack spacing={1}>
              <Typography>
                <strong>{t('name')}:</strong> {profile.firstName} {profile.lastName}
              </Typography>
              {profile.clientId !== undefined && (
                <Typography>
                  <strong>{t('client_id')}:</strong> {profile.clientId}
                </Typography>
              )}
              {profile.roles && profile.roles.length > 0 && (
                <Typography>
                  <strong>{t('roles')}:</strong> {profile.roles.join(', ')}
                </Typography>
              )}
              {profile.username && (
                <Typography>
                  <strong>{t('username')}:</strong> {profile.username}
                </Typography>
              )}
              {profile.trainedAreas && profile.trainedAreas.length > 0 && (
                <Typography>
                  <strong>{t('trained_areas')}:</strong> {profile.trainedAreas.join(', ')}
                </Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <TextField
                label={t('email')}
                type="email"
                size="small"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!editing}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={profile.role === 'agency' ? t('contact_info') : t('phone')}
                type={profile.role === 'agency' ? 'text' : 'tel'}
                size="small"
                value={phone}
                onChange={e => {
                  const val = e.target.value;
                  setPhone(val);
                  if (profile.role !== 'agency') {
                    if (val && !phoneRegex.test(val)) {
                      setPhoneError(t('phone_format_error'));
                    } else {
                      setPhoneError('');
                    }
                  }
                }}
                disabled={!editing}
                InputLabelProps={{ shrink: true }}
                error={profile.role === 'agency' ? false : !!phoneError}
                helperText={
                  profile.role === 'agency'
                    ? undefined
                    : phoneError || t('phone_format_hint')
                }
              />
              {profile.bookingsThisMonth !== undefined && (
                <Typography>
                  <strong>{t('visits_this_month')}:</strong> {profile.bookingsThisMonth}
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
            {editing ? t('save') : t('edit_profile')}
          </Button>

          <Divider sx={{ my: 1 }} />

          {/* Password reset */}
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Lock fontSize="small" />
              <Typography variant="h6">{t('reset_password')}</Typography>
            </Stack>

            <TextField
              id="current-password"
              label={t('current_password')}
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
              label={t('new_password')}
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
              {t('password_hint')}
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
              {submitting ? t('updating') : t('reset_password')}
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
