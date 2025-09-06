import { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
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
} from "@mui/material";
import Page from "../../../components/Page";
import FeedbackSnackbar from "../../../components/FeedbackSnackbar";
import DialogCloseButton from "../../../components/DialogCloseButton";
import { 
  getIncompleteUsers,
  updateUserInfo,
  type IncompleteUser,
} from "../../../api/users";
import type { AlertColor } from "@mui/material";
import PasswordField from "../../../components/PasswordField";

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

  function handleEdit(client: IncompleteUser) {
    setSelected(client);
    setForm({
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email || "",
      phone: client.phone || "",
      onlineAccess: false,
      password: "",
    });
  }

  async function handleSave() {
    if (!selected) return;
    try {
      await updateUserInfo(selected.clientId, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        onlineAccess: form.onlineAccess,
        ...(form.onlineAccess ? { password: form.password } : {}),
      });
      setSnackbar({
        open: true,
        message: "Client updated",
        severity: "success",
      });
      setSelected(null);
      loadClients();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Update failed",
        severity: "error",
      });
    }
  }

  return (
    <Page title="Update Client Data">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Client ID</TableCell>
            <TableCell>Profile Link</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.clientId}>
              <TableCell>{client.clientId}</TableCell>
              <TableCell>
                <Link
                  href={client.profileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {client.profileLink}
                </Link>
              </TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleEdit(client)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
                />
              }
              label="Online Access"
            />
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
            {form.onlineAccess && (
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
            <Button
              onClick={handleSave}
              disabled={
                !form.firstName ||
                !form.lastName ||
                (form.onlineAccess && !form.password)
              }
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
    </Page>
  );
}
