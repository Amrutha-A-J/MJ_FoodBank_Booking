import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  IconButton,
} from '@mui/material';
import Page from '../../components/Page';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { listStaff, deleteStaff, searchStaff } from '../../api/adminStaff';
import type { Staff, StaffAccess } from '../../types';

export default function AdminStaffList() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const accessLabels: Record<StaffAccess, string> = {
    pantry: 'Pantry',
    volunteer_management: 'Volunteer Management',
    warehouse: 'Warehouse',
    admin: 'Admin',
    other: 'Other',
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

  async function handleDelete(id: number) {
    try {
      await deleteStaff(id);
      setSuccess('Staff deleted');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  return (
    <Page title="Staff List">
      <Box p={2}>
        <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
        <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} />
        <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
          <TextField
            label="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
          />
          <Button variant="contained" component={RouterLink} to="/admin/staff/create">
            Add Staff
          </Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Access</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staff.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.firstName} {s.lastName}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.access.map(a => accessLabels[a]).join(', ')}</TableCell>
                <TableCell align="right">
                  <IconButton component={RouterLink} to={`/admin/staff/${s.id}`} size="small" aria-label="edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(s.id)} size="small" aria-label="delete">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Page>
  );
}
