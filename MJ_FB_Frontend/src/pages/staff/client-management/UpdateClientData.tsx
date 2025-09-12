import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  Link,
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
import getApiErrorMessage from "../../../utils/getApiErrorMessage";
import ResponsiveTable, { type Column } from "../../../components/ResponsiveTable";
import EditClientForm, {
  type EditClientFormData,
} from "./EditClientForm";

export default function UpdateClientData() {
  const [clients, setClients] = useState<IncompleteUser[]>([]);
  const [selected, setSelected] = useState<IncompleteUser | null>(null);
  const [form, setForm] = useState<EditClientFormData>({
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
      .catch(err => {
        setClients([]);
        setSnackbar({
          open: true,
          message: getApiErrorMessage(err, 'Failed to load clients'),
          severity: 'error',
        });
      });
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
    } catch (err: unknown) {
      setForm({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        email: client.email || "",
        phone: client.phone || "",
        onlineAccess: false,
        password: "",
        hasPassword: false,
      });
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Failed to load client details'),
        severity: 'error',
      });
    }
  }

  async function handleSave(data: EditClientFormData): Promise<boolean> {
    if (!selected) return false;
    try {
      await updateUserInfo(selected.clientId, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        onlineAccess: data.hasPassword ? true : data.onlineAccess,
        ...(data.onlineAccess && data.password
          ? { password: data.password }
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
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Unable to update client'),
        severity: 'error',
      });
      return false;
    }
  }

  async function handleSendReset(data: EditClientFormData) {
    if (!selected) return;
    const ok = await handleSave(data);
    if (!ok) return;
    try {
      await requestPasswordReset({ clientId: String(selected.clientId) });
      setSnackbar({
        open: true,
        message: "Password reset link sent",
        severity: "success",
      });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, 'Failed to send password reset link'),
        severity: 'error',
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
        <EditClientForm
          open={!!selected}
          initialData={form}
          onSave={handleSave}
          onSendReset={handleSendReset}
        />
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
