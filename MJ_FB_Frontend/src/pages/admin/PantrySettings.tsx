import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getAllSlots, createSlot, updateSlot, deleteSlot } from '../../api/slots';
import type { Slot } from '../../types';

export default function PantrySettings() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [newSlot, setNewSlot] = useState({ startTime: '', endTime: '', maxCapacity: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setSlots(await getAllSlots());
    } catch {
      /* ignore */
    }
  }

  const handleChange = (id: string, value: string) => {
    setSlots(prev =>
      prev.map(s => (s.id === id ? { ...s, maxCapacity: Number(value) } : s)),
    );
  };

  async function handleSave(slot: Slot) {
    try {
      await updateSlot(Number(slot.id), slot.startTime, slot.endTime, slot.maxCapacity);
      setSnackbar({ open: true, message: 'Slot updated', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to update slot',
        severity: 'error',
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSlot(Number(id));
      setSlots(prev => prev.filter(s => s.id !== id));
      setSnackbar({ open: true, message: 'Slot deleted', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete slot',
        severity: 'error',
      });
    }
  }

  async function handleAdd() {
    try {
      const slot = await createSlot(
        newSlot.startTime,
        newSlot.endTime,
        Number(newSlot.maxCapacity),
      );
      setSlots(prev => [...prev, slot]);
      setNewSlot({ startTime: '', endTime: '', maxCapacity: '' });
      setSnackbar({ open: true, message: 'Slot created', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create slot',
        severity: 'error',
      });
    }
  }

  return (
    <>
      <Card>
        <CardHeader title="Pantry Settings" />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Max Capacity</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slots.map(slot => (
                <TableRow key={slot.id}>
                  <TableCell>{slot.startTime}-{slot.endTime}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={slot.maxCapacity}
                      onChange={e => handleChange(slot.id, e.target.value)}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSave(slot)}
                      sx={{ mr: 1 }}
                    >
                      Save
                    </Button>
                    <IconButton
                      aria-label="delete"
                      size="small"
                      onClick={() => handleDelete(slot.id)}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <TextField
                    label="Start"
                    size="small"
                    value={newSlot.startTime}
                    onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End"
                    size="small"
                    value={newSlot.endTime}
                    onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ml: 1 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    label="Max"
                    type="number"
                    size="small"
                    value={newSlot.maxCapacity}
                    onChange={e => setNewSlot({ ...newSlot, maxCapacity: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button variant="contained" size="small" onClick={handleAdd}>
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <FeedbackSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </>
  );
}
