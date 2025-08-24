import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listStaff, searchStaff, deleteStaff, type StaffSummary } from '../api/adminStaff';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Stack,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import FeedbackSnackbar from '../components/FeedbackSnackbar';

export default function AdminStaffList({ token }: { token: string }) {
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await listStaff(token);
      setStaff(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSearch() {
    try {
      if (search) {
        const data = await searchStaff(token, search);
        setStaff(data);
      } else {
        load();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteStaff(token, id);
      setSuccess('Staff deleted');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Staff
      </Typography>
      <Stack direction="row" spacing={1} mb={2} alignItems="center">
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button variant="contained" size="small" onClick={handleSearch}>
          Search
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate('/admin/staff/new')}
        >
          Add Staff
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {staff.map(s => (
            <TableRow key={s.id} hover>
              <TableCell>{`${s.first_name} ${s.last_name}`}</TableCell>
              <TableCell>{s.email}</TableCell>
              <TableCell>{s.role}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/admin/staff/${s.id}`)}
                  aria-label="edit"
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(s.id)}
                  aria-label="delete"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
      <FeedbackSnackbar
        open={!!success}
        onClose={() => setSuccess('')}
        message={success}
      />
    </Box>
  );
}
