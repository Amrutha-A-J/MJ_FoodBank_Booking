import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  IconButton,
} from '@mui/material';
import Page from '../../components/Page';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ResponsiveTable from '../../components/ResponsiveTable';
import { listStaff, deleteStaff, searchStaff } from '../../api/adminStaff';
import type { Staff, StaffAccess } from '../../types';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminStaffList() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toDelete, setToDelete] = useState<Staff | null>(null);

  const accessLabels: Record<StaffAccess, string> = {
    pantry: 'Pantry',
    volunteer_management: 'Volunteer Management',
    warehouse: 'Warehouse',
    admin: 'Admin',
    donor_management: 'Donor Management',
    payroll_management: 'Payroll Management',
    donation_entry: 'Donation Entry',
  };

  async function load() {
    try {
      const data = search.length >= 3 ? await searchStaff(search) : await listStaff();
      setStaff(data);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await deleteStaff(toDelete.id);
      setSuccess('Staff deleted');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setToDelete(null);
    }
  }

  return (
    <ErrorBoundary>
      <Page title="Staff List">
        <Box p={2}>
          <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
          <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} />
          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <TextField
              label="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              
            />
            <Button variant="contained" component={RouterLink} to="/admin/staff/create">
              Add Staff
            </Button>
          </Box>
          <ResponsiveTable
            columns={[
              {
                field: 'firstName',
                header: 'Name',
                render: (row: Staff) => `${row.firstName} ${row.lastName}`,
              },
              { field: 'email', header: 'Email' },
              {
                field: 'access',
                header: 'Access',
                render: (row: Staff) => row.access.map(a => accessLabels[a]).join(', '),
              },
              {
                field: 'id',
                header: 'Actions',
                render: (row: Staff) => (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton component={RouterLink} to={`/admin/staff/${row.id}`} aria-label="edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => setToDelete(row)} aria-label="delete">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ),
              },
            ]}
            rows={staff}
            getRowKey={row => row.id}
          />
          {toDelete && (
            <ConfirmDialog
              message={`Delete ${toDelete.firstName} ${toDelete.lastName}?`}
              onConfirm={handleDelete}
              onCancel={() => setToDelete(null)}
            />
          )}
        </Box>
      </Page>
    </ErrorBoundary>
  );
}
