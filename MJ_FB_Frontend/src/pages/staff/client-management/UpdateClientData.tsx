import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Link,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Typography,
  TableContainer,
} from "@mui/material";
import FeedbackSnackbar from "../../../components/FeedbackSnackbar";
import DialogCloseButton from "../../../components/DialogCloseButton";
import {
  getIncompleteUsers,
  updateUserInfo,
  type IncompleteUser,
  getUserByClientId,
  requestPasswordReset,
} from "../../../api/users";
import type { AlertColor } from "@mui/material";
import type { ApiError } from "../../../api/client";
import PasswordField from "../../../components/PasswordField";
import ResponsiveTable, { type Column } from "../../../components/ResponsiveTable";

export default function UpdateClientData() {
  const [clients, setClients] = useState<IncompleteUser[]>([]);
  const [selected, setSelected] = useState<IncompleteUser | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    onlineAccess: false,
    password: "",
    hasPassword: false,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  } | null>(null);

  function loadClients() {
    getIncompleteUsers()
      .then(setClients)
      .catch(() => setClients([]));
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleEdit(client: IncompleteUser) {
    setSelected(client);
    try {
      const data = await getUserByClientId(String(client.clientId));
      setForm({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phone: data.phone || "",
        onlineAccess: Boolean(data.onlineAccess),
        password: "",
        hasPassword: data.hasPassword,
      });
    } catch {
      setForm({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        email: client.email || "",
        phone: client.phone || "",
        onlineAccess: false,
        password: "",
        hasPassword: false,
      });
    }
  }

  async function handleSave(): Promise<boolean> {
    if (!selected) return false;
    try {
      await updateUserInfo(selected.clientId, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        onlineAccess: form.hasPassword ? true : form.onlineAccess,
        ...(form.onlineAccess && form.password
          ? { password: form.password }
          : {}),
      });
      setSnackbar({
        open: true,
        message: "Client updated",
        severity: "success",
      });
      setSelected(null);
      loadClients();
      return true;
    } catch (err: unknown) {
      let message = "Update failed";
      const apiErr = err as ApiError;
      const details = apiErr?.details as any;
      if (details?.errors?.[0]?.message) {
        message = details.errors[0].message as string;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
      return false;
    }
  }

  async function handleSendReset() {
    if (!selected) return;
    const ok = await handleSave();
    if (!ok) return;
    try {
      await requestPasswordReset({ clientId: String(selected.clientId) });
      setSnackbar({
        open: true,
        message: "Password reset link sent",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to send password reset link",
        severity: "error",
      });
    }
  }

  type ClientRow = IncompleteUser & { actions?: string };

  const columns: Column<ClientRow>[] = [
    { field: 'clientId', header: 'Client ID' },
    {
      field: 'profileLink',
      header: 'Profile Link',
      render: c => (
        <Link href={c.profileLink} target="_blank" rel="noopener noreferrer">
          {c.profileLink}
        </Link>
      ),
    },
    {
      field: 'actions' as keyof ClientRow & string,
      header: 'Actions',
      render: c => (
        <Button variant="outlined" onClick={() => handleEdit(c)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Update Client Data
      </Typography>
      <TableContainer>
        <ResponsiveTable
          columns={columns}
          rows={clients}
          getRowKey={c => c.clientId}
        />
      </TableContainer>

      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        <DialogCloseButton onClose={() => setSelected(null)} />
        <DialogTitle>
          Edit Client -{" "}
          {selected && (
            <Link
              href={selected.profileLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {selected.clientId}
            </Link>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Tooltip
              title="Client already has a password"
              disableHoverListener={!form.hasPassword}
            >
              <span>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.onlineAccess}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          onlineAccess: e.target.checked,
                        })
                      }
                      disabled={form.hasPassword}
                    />
                  }
                  label="Online Access"
                />
              </span>
            </Tooltip>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            {form.onlineAccess && !form.hasPassword && (
              <PasswordField
                label="Password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            )}
          </Stack>
        </DialogContent>
          <DialogActions>
            {form.onlineAccess && (
              <Button variant="outlined" onClick={handleSendReset}>
                Send password reset link
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!form.firstName || !form.lastName}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ""}
        severity={snackbar?.severity}
      />
    </Box>
  );
}
