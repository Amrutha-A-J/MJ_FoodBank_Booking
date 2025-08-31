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
import { getUserProfile, requestPasswordReset, updateMyProfile } from '../../api/users';
import { getVolunteerProfile } from '../../api/volunteers';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import PageContainer from '../../components/layout/PageContainer';
import PageCard from '../../components/layout/PageCard';
import { useTranslation } from 'react-i18next';

export default function Profile({ role }: { role: Role }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
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
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('profile_page.title');
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

  async function handleReset() {
    if (!profile) return;
    setSubmitting(true);
    try {
      const body =
        profile.role === 'volunteer'
          ? { username: profile.username ?? '' }
          : profile.role === 'shopper' || profile.role === 'delivery'
          ? { clientId: String(profile.clientId) }
          : { email: profile.email ?? '' };
      await requestPasswordReset(body);
      setToast({ open: true, message: t('reset_link_sent'), severity: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!profile) return;
    if (editing) {
      if (profile.role !== 'agency' && phone && phoneError) {
        setToast({ open: true, message: t('profile_page.phone_invalid'), severity: 'error' });
        return;
      }
      setSaving(true);
      try {
        const updated = await updateMyProfile({ email, phone });
        setProfile(updated);
        setEmail(updated.email ?? '');
        setPhone(updated.phone ?? '');
        setToast({ open: true, message: t('profile_page.profile_updated'), severity: 'success' });
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
                {t('profile_page.user_profile')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('profile_page.breadcrumb')}
              </Typography>
            </Stack>
          </Stack>

          {/* Profile info */}
          {error && <Typography color="error">{error}</Typography>}
          {!profile && !error && <Typography>{t('profile_page.loading')}</Typography>}
          {profile && (
            <Stack spacing={1}>
              <Typography>
                <strong>{t('profile_page.name')}</strong> {profile.firstName} {profile.lastName}
              </Typography>
              {profile.clientId !== undefined && (
                <Typography>
                  <strong>{t('profile_page.client_id')}</strong> {profile.clientId}
                </Typography>
              )}
              {profile.roles && profile.roles.length > 0 && (
                <Typography>
                  <strong>{t('profile_page.roles')}</strong> {profile.roles.join(', ')}
                </Typography>
              )}
              {profile.username && (
                <Typography>
                  <strong>{t('profile_page.username')}</strong> {profile.username}
                </Typography>
              )}
              {profile.trainedAreas && profile.trainedAreas.length > 0 && (
                <Typography>
                  <strong>{t('profile_page.trained_areas')}</strong> {profile.trainedAreas.join(', ')}
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
                label={profile.role === 'agency' ? t('profile_page.contact_info') : t('profile_page.phone')}
                type={profile.role === 'agency' ? 'text' : 'tel'}
                size="small"
                value={phone}
                onChange={e => {
                  const val = e.target.value;
                  setPhone(val);
                  if (profile.role !== 'agency') {
                    if (val && !phoneRegex.test(val)) {
                      setPhoneError(t('profile_page.phone_chars'));
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
                    : phoneError || t('profile_page.phone_hint')
                }
              />
              {profile.bookingsThisMonth !== undefined && (
                <Typography>
                  <strong>{t('profile_page.visits_this_month')}</strong> {profile.bookingsThisMonth}
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
            {editing ? t('profile_page.save') : t('profile_page.edit_profile')}
          </Button>

          <Divider sx={{ my: 1 }} />

          {/* Password reset */}
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Lock fontSize="small" />
              <Typography variant="h6">{t('reset_password')}</Typography>
            </Stack>

            <Button
              variant="contained"
              color="success"
              size="small"
              fullWidth
              disabled={submitting || !profile}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
              onClick={handleReset}
            >
              {t('reset_password')}
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
