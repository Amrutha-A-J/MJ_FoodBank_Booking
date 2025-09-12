import { useEffect, useState } from "react";
import { Box, Button, Link, TableContainer, Typography } from "@mui/material";
import FeedbackSnackbar from "../../../components/FeedbackSnackbar";
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
import EditClientForm, { type EditClientFormValues } from "./EditClientForm";

export default function UpdateClientData() {
  const [clients, setClients] = useState<IncompleteUser[]>([]);
  const [selected, setSelected] = useState<IncompleteUser | null>(null);
  const [initialValues, setInitialValues] = useState<EditClientFormValues>({
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
      setInitialValues({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phone: data.phone || "",
        onlineAccess: Boolean(data.onlineAccess),
        password: "",
        hasPassword: data.hasPassword,
      });
    } catch (err: unknown) {
      setInitialValues({
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

export async function handleSave(
  clientId: number,
  form: EditClientFormValues,
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: AlertColor;
  }) => void,
  setSelected: (value: IncompleteUser | null) => void,
  loadClients: () => void,
): Promise<boolean> {
  try {
    await updateUserInfo(clientId, {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      onlineAccess: form.hasPassword ? true : form.onlineAccess,
      ...(form.onlineAccess && form.password ? { password: form.password } : {}),
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

export async function handleSendReset(
  clientId: number,
  form: EditClientFormValues,
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: AlertColor;
  }) => void,
  setSelected: (value: IncompleteUser | null) => void,
  loadClients: () => void,
): Promise<void> {
  const ok = await handleSave(clientId, form, setSnackbar, setSelected, loadClients);
  if (!ok) return;
  try {
    await requestPasswordReset({ clientId: String(clientId) });
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

        {selected && (
          <EditClientForm
            open={!!selected}
            initialValues={initialValues}
            onClose={() => setSelected(null)}
            onSave={form =>
              handleSave(selected.clientId, form, setSnackbar, setSelected, loadClients)
            }
            onSendReset={form =>
              handleSendReset(
                selected.clientId,
                form,
                setSnackbar,
                setSelected,
                loadClients,
              )
            }
          />
        )}

      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ""}
        severity={snackbar?.severity}
      />
    </Box>
  );
}
