import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import Page from '../../components/Page';
import {
  getVolunteerMasterRoles,
  getVolunteerRoles,
  createVolunteerMasterRole,
  updateVolunteerMasterRole,
  deleteVolunteerMasterRole,
  createVolunteerRole,
  updateVolunteerRole,
  toggleVolunteerRole,
  deleteVolunteerRole,
} from '../../api/volunteers';
import type {
  VolunteerMasterRole,
  VolunteerRoleWithShifts,
} from '../../types';

interface RoleDialogState {
  open: boolean;
  slotId?: number;
  name: string;
  startTime: string;
  endTime: string;
  maxVolunteers: number;
  categoryId: number;
  isWednesday: boolean;
}

interface MasterDialogState {
  open: boolean;
  id?: number;
  name: string;
}

export default function VolunteerSettings() {
  const [masterRoles, setMasterRoles] = useState<VolunteerMasterRole[]>([]);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleDialog, setRoleDialog] = useState<RoleDialogState>({ open: false, name: '', startTime: '', endTime: '', maxVolunteers: 1, categoryId: 0, isWednesday: false });
  const [masterDialog, setMasterDialog] = useState<MasterDialogState>({ open: false, name: '' });

  async function load() {
    try {
      const [m, r] = await Promise.all([
        getVolunteerMasterRoles(),
        getVolunteerRoles(),
      ]);
      setMasterRoles(m);
      setRoles(r);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rolesByMaster = (id: number) => roles.filter(r => r.category_id === id);

  function openNewMaster() {
    setMasterDialog({ open: true, name: '' });
  }
  function openEditMaster(m: VolunteerMasterRole) {
    setMasterDialog({ open: true, id: m.id, name: m.name });
  }
  async function saveMaster() {
    try {
      if (masterDialog.id)
        await updateVolunteerMasterRole(masterDialog.id, masterDialog.name);
      else
        await createVolunteerMasterRole(masterDialog.name);
      setMasterDialog({ open: false, name: '' });
      setSuccess('Saved');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }
  async function removeMaster(id: number) {
    if (!window.confirm('Delete master role?')) return;
    try {
      await deleteVolunteerMasterRole(id);
      setSuccess('Deleted');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  function openNewRole(categoryId: number, name = '') {
    setRoleDialog({ open: true, categoryId, name, startTime: '', endTime: '', maxVolunteers: 1, isWednesday: false });
  }
  function openEditShift(role: VolunteerRoleWithShifts, slot: any) {
    setRoleDialog({
      open: true,
      slotId: slot.id,
      name: role.name,
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxVolunteers: role.max_volunteers,
      categoryId: role.category_id,
      isWednesday: slot.is_wednesday_slot,
    });
  }
  async function saveRole() {
    const { slotId, name, startTime, endTime, maxVolunteers, categoryId, isWednesday } = roleDialog;
    try {
      if (slotId)
        await updateVolunteerRole(slotId, { name, startTime, endTime, maxVolunteers, categoryId, isWednesdaySlot: isWednesday });
      else
        await createVolunteerRole({ name, startTime, endTime, maxVolunteers, categoryId, isWednesdaySlot: isWednesday });
      setRoleDialog({ open: false, name: '', startTime: '', endTime: '', maxVolunteers: 1, categoryId: 0, isWednesday: false });
      setSuccess('Saved');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }
  async function removeRole(role: VolunteerRoleWithShifts) {
    if (!window.confirm('Delete role and its shifts?')) return;
    try {
      for (const s of role.shifts) {
        await deleteVolunteerRole(s.id);
      }
      setSuccess('Deleted');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }
  async function removeShift(id: number) {
    if (!window.confirm('Delete shift?')) return;
    try {
      await deleteVolunteerRole(id);
      setSuccess('Deleted');
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }
  async function toggleShift(id: number, active: boolean) {
    try {
      await toggleVolunteerRole(id, active);
      load();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  return (
    <Page title="Volunteer Settings">
      <Box p={2}>
        <FeedbackSnackbar open={!!error} onClose={() => setError('')} message={error} severity="error" />
        <FeedbackSnackbar open={!!success} onClose={() => setSuccess('')} message={success} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNewMaster} sx={{ mb: 2 }}>
          Add Master Role
        </Button>
        {masterRoles.map(m => (
          <Card key={m.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{m.name}</Typography>
                <Box>
                  <IconButton onClick={() => openEditMaster(m)} size="small" aria-label="edit">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => removeMaster(m.id)} size="small" aria-label="delete">
                    <DeleteIcon />
                  </IconButton>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openNewRole(m.id)} sx={{ ml: 1 }}>
                    Add Role
                  </Button>
                </Box>
              </Box>
              {rolesByMaster(m.id).map(r => (
                <Box key={r.role_id} mt={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>{r.name}</Typography>
                    <Box>
                      <IconButton onClick={() => openNewRole(m.id, r.name)} size="small" aria-label="add shift">
                        <AddIcon />
                      </IconButton>
                      <IconButton onClick={() => removeRole(r)} size="small" aria-label="delete role">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Start</TableCell>
                        <TableCell>End</TableCell>
                        <TableCell>Max</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {r.shifts.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>{s.start_time}</TableCell>
                          <TableCell>{s.end_time}</TableCell>
                          <TableCell>{r.max_volunteers}</TableCell>
                          <TableCell>
                            <Switch
                              checked={s.is_active}
                              onChange={(_, checked) => toggleShift(s.id, checked)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => openEditShift(r, s)} size="small" aria-label="edit">
                              <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => removeShift(s.id)} size="small" aria-label="delete">
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}
            </CardContent>
          </Card>
        ))}

        <Dialog open={masterDialog.open} onClose={() => setMasterDialog({ open: false, name: '' })}>
          <DialogTitle>{masterDialog.id ? 'Edit' : 'Add'} Master Role</DialogTitle>
          <DialogContent>
            <TextField
              label="Name"
              value={masterDialog.name}
              onChange={e => setMasterDialog({ ...masterDialog, name: e.target.value })}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMasterDialog({ open: false, name: '' })}>Cancel</Button>
            <Button onClick={saveMaster} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, name: '', startTime: '', endTime: '', maxVolunteers: 1, categoryId: 0, isWednesday: false })}>
          <DialogTitle>{roleDialog.slotId ? 'Edit' : 'Add'} Role</DialogTitle>
          <DialogContent>
            <TextField
              label="Name"
              value={roleDialog.name}
              onChange={e => setRoleDialog({ ...roleDialog, name: e.target.value })}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Start Time"
              value={roleDialog.startTime}
              onChange={e => setRoleDialog({ ...roleDialog, startTime: e.target.value })}
              fullWidth
              margin="dense"
            />
            <TextField
              label="End Time"
              value={roleDialog.endTime}
              onChange={e => setRoleDialog({ ...roleDialog, endTime: e.target.value })}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Max Volunteers"
              type="number"
              value={roleDialog.maxVolunteers}
              onChange={e => setRoleDialog({ ...roleDialog, maxVolunteers: Number(e.target.value) })}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialog({ open: false, name: '', startTime: '', endTime: '', maxVolunteers: 1, categoryId: 0, isWednesday: false })}>Cancel</Button>
            <Button onClick={saveRole} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Page>
  );
}
