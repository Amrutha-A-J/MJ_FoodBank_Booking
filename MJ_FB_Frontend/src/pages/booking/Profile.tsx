import { useEffect, useState } from "react";
import {
  Stack,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  Avatar,
  Divider,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import Lock from "@mui/icons-material/Lock";
import type { Role, UserProfile, UserPreferences } from "../../types";
import {
  getUserProfile,
  requestPasswordReset,
  updateMyProfile,
  getUserPreferences,
  updateUserPreferences,
} from "../../api/users";
import { getVolunteerProfile } from "../../api/volunteers";
import FeedbackSnackbar from "../../components/FeedbackSnackbar";
import PageContainer from "../../components/layout/PageContainer";
import PageCard from "../../components/layout/PageCard";
import ErrorBoundary from "../../components/ErrorBoundary";
import ClientBottomNav from "../../components/ClientBottomNav";
import VolunteerBottomNav from "../../components/VolunteerBottomNav";

export default function Profile({ role }: { role: Role }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>({ emailReminders: true });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  useEffect(() => {
    document.title = "Profile";
  }, []);

  useEffect(() => {
    const loader = role === "volunteer" ? getVolunteerProfile : getUserProfile;
    loader()
      .then((p) => {
        setProfile(p);
        setEmail(p.email ?? "");
        setAddress(p.address ?? "");
        setPhone(p.phone ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [role]);
  useEffect(() => {
    if (role === "volunteer" || role === "shopper" || role === "delivery") {
      getUserPreferences()
        .then((p) => setPrefs(p))
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }
  }, [role]);

  const firstInitial = profile?.firstName?.[0] ?? "";
  const secondInitial =
    profile?.lastName?.[0] ?? profile?.firstName?.[1] ?? "";
  const initials = `${firstInitial}${secondInitial}`.toUpperCase();
  const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

  async function handleReset() {
    if (!profile) return;
    setSubmitting(true);
    try {
      const body =
        profile.role === "shopper" || profile.role === "delivery"
          ? { clientId: String(profile.clientId) }
          : { email: profile.email ?? "" };
      await requestPasswordReset(body);
      setToast({ open: true, message: "Reset link sent", severity: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ open: true, message: msg, severity: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!profile) return;
    if (editing) {
      if (phone && phoneError) {
        setToast({
          open: true,
          message: "Invalid phone number",
          severity: "error",
        });
        return;
      }
      setSaving(true);
      try {
        const updated = await updateMyProfile({ email, phone, address });
        setProfile(updated);
        setEmail(updated.email ?? "");
        setAddress(updated.address ?? "");
        setPhone(updated.phone ?? "");
        setToast({
          open: true,
          message: "Profile updated",
          severity: "success",
        });
        setEditing(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setToast({ open: true, message: msg, severity: "error" });
      } finally {
        setSaving(false);
      }
    } else {
      setEditing(true);
    }
  }
  async function handleSavePreferences() {
    setPrefsSaving(true);
    try {
      const updated = await updateUserPreferences(prefs);
      setPrefs(updated);
      setToast({
        open: true,
        message: "Preferences saved",
        severity: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ open: true, message: msg, severity: "error" });
    } finally {
      setPrefsSaving(false);
    }
  }

  return (
    <ErrorBoundary>
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
              <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
                {initials || " "}
              </Avatar>
              <Stack>
                <Typography variant="h4" fontWeight={700}>
                  User Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your account
                </Typography>
              </Stack>
            </Stack>

            {/* Profile info */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
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
                    <strong>Roles:</strong> {profile.roles.join(", ")}
                  </Typography>
                )}
                {profile.trainedAreas && profile.trainedAreas.length > 0 && (
                  <Typography>
                    <strong>Trained areas:</strong>{" "}
                    {profile.trainedAreas.join(", ")}
                  </Typography>
                )}
                <Divider sx={{ my: 1 }} />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editing}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!editing}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhone(val);
                    if (val && !phoneRegex.test(val)) {
                      setPhoneError(
                        "Phone number must contain only numbers, spaces, or dashes",
                      );
                    } else {
                      setPhoneError("");
                    }
                  }}
                  disabled={!editing}
                  InputLabelProps={{ shrink: true }}
                  error={!!phoneError}
                  helperText={
                    phoneError ||
                    "Include country code (e.g., +1 306 555-1234)"
                  }
                />
                {profile.bookingsThisMonth !== undefined && (
                  <Typography>
                    <strong>Visits this month:</strong>{" "}
                    {profile.bookingsThisMonth}
                  </Typography>
                )}
              </Stack>
            )}

            <Button
              variant="outlined"
              startIcon={
                saving ? <CircularProgress size={20} /> : <AccountCircle />
              }
              disabled={saving || !profile}
              onClick={handleEdit}
            >
              {editing ? "Save" : "Edit profile"}
            </Button>

            {(role === "volunteer" ||
              profile?.role === "shopper" ||
              profile?.role === "delivery") && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6">Notifications</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs.emailReminders}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          emailReminders: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Email reminders"
                />
                <Button
                  variant="outlined"
                  startIcon={
                    prefsSaving ? (
                      <CircularProgress size={20} />
                    ) : (
                      <AccountCircle />
                    )
                  }
                  disabled={prefsSaving}
                  onClick={handleSavePreferences}
                >
                  Save
                </Button>
              </>
            )}
            <Divider sx={{ my: 1 }} />

            {/* Password reset */}
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Lock fontSize="small" />
                <Typography variant="h6">Reset password</Typography>
              </Stack>

              <Button
                variant="contained"
                color="success"
                fullWidth
                disabled={submitting || !profile}
                startIcon={submitting ? <CircularProgress size={20} /> : null}
                onClick={handleReset}
              >
                Reset password
              </Button>
            </Stack>
          </Stack>
        </PageCard>

        <FeedbackSnackbar
          open={toast.open}
          onClose={() => setToast((s) => ({ ...s, open: false }))}
          message={toast.message}
          severity={toast.severity}
        />
      </PageContainer>
      {role === "volunteer" ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </ErrorBoundary>
  );
}
