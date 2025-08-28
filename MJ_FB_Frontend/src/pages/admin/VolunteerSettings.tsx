import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
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
import { formatTime } from '../../utils/time';
import type { VolunteerRoleWithShifts } from '../../types';

type MasterRole = { id: number; name: string };

export default function VolunteerSettings() {
  const [masterRoles, setMasterRoles] = useState<MasterRole[]>([]);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const [masterDialog, setMasterDialog] = useState<{ open: boolean; id?: number; name: string }>({ open: false, name: '' });
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    slotId?: number;
    roleName: string;
    startTime: string;
    endTime: string;
    maxVolunteers: string;
    categoryId?: number;
    isWednesdaySlot: boolean;
  }>({ open: false, roleName: '', startTime: '', endTime: '', maxVolunteers: '1', isWednesdaySlot: false });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [master, roleData] = await Promise.all([
        getVolunteerMasterRoles(),
        getVolunteerRoles(),
      ]);
      setMasterRoles(master);
      setRoles(roleData);
    } catch (e) {
      setSnack({ open: true, message: 'Failed to load roles', severity: 'error' });
    }
  }

  function handleSnack(message: string, severity: 'success' | 'error' = 'success') {
    setSnack({ open: true, message, severity });
  }

  function openMasterDialog(role?: MasterRole) {
    setMasterDialog({ open: true, id: role?.id, name: role?.name || '' });
  }

  async function saveMasterRole() {
    try {
      if (masterDialog.id) {
        await updateVolunteerMasterRole(masterDialog.id, masterDialog.name);
        handleSnack('Master role updated');
      } else {
        await createVolunteerMasterRole(masterDialog.name);
        handleSnack('Master role created');
      }
      setMasterDialog({ open: false, name: '' });
      loadData();
    } catch (e) {
      handleSnack('Failed to save master role', 'error');
    }
  }

  async function removeMasterRole(id: number) {
    try {
      await deleteVolunteerMasterRole(id);
      handleSnack('Master role deleted');
      loadData();
    } catch (e) {
      handleSnack('Failed to delete master role', 'error');
    }
  }

  function openRoleDialog(init: Partial<typeof roleDialog>) {
    setRoleDialog({
      open: true,
      slotId: init.slotId,
      roleName: init.roleName || '',
      startTime: init.startTime || '',
      endTime: init.endTime || '',
      maxVolunteers: init.maxVolunteers?.toString() || '1',
      categoryId: init.categoryId,
      isWednesdaySlot: init.isWednesdaySlot || false,
    });
  }

  async function saveRole() {
    try {
      if (!roleDialog.roleName || !roleDialog.startTime || !roleDialog.endTime || !roleDialog.categoryId) {
        handleSnack('All fields are required', 'error');
        return;
      }
      const maxVolunteers = Number(roleDialog.maxVolunteers);
      if (roleDialog.slotId) {
        await updateVolunteerRole(roleDialog.slotId, {
          name: roleDialog.roleName,
          startTime: roleDialog.startTime,
          endTime: roleDialog.endTime,
          maxVolunteers,
          categoryId: roleDialog.categoryId,
          isWednesdaySlot: roleDialog.isWednesdaySlot,
        });
        handleSnack('Role updated');
      } else {
        await createVolunteerRole(
          roleDialog.roleName,
          roleDialog.startTime,
          roleDialog.endTime,
          maxVolunteers,
          roleDialog.categoryId,
          roleDialog.isWednesdaySlot,
          true,
        );
        handleSnack('Role created');
      }
      setRoleDialog({ open: false, roleName: '', startTime: '', endTime: '', maxVolunteers: '1', isWednesdaySlot: false });
      loadData();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save role';
      handleSnack(message, 'error');
    }
  }

  async function removeRole(role: VolunteerRoleWithShifts) {
    try {
      for (const shift of role.shifts) {
        await deleteVolunteerRole(shift.id);
      }
      handleSnack('Role deleted');
      loadData();
    } catch (e) {
      handleSnack('Failed to delete role', 'error');
    }
  }

  async function removeShift(id: number) {
    try {
      await deleteVolunteerRole(id);
      handleSnack('Shift deleted');
      loadData();
    } catch (e) {
      handleSnack('Failed to delete shift', 'error');
    }
  }

  async function toggleShift(id: number, isActive: boolean) {
    try {
      await toggleVolunteerRole(id, isActive);
      loadData();
    } catch (e) {
      handleSnack('Failed to update shift', 'error');
    }
  }

  return (
    <Page title="Volunteer Settings">
      <Box p={2}>
        <Grid container spacing={2}>
          {masterRoles.map(master => (
            <Grid item xs={12} key={master.id}>
              <Card>
                <CardHeader
                  title={master.name}
                  action={
                    <Stack direction="row" spacing={1}>
                      <IconButton aria-label="edit" onClick={() => openMasterDialog(master)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton aria-label="delete" onClick={() => removeMasterRole(master.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                />
                <CardContent>
                  {roles.filter(r => r.category_id === master.id).map(role => (
                    <Box key={role.id} mb={2}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item xs>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {role.name}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => openRoleDialog({ roleName: role.name, categoryId: master.id })}
                          >
                            Add Shift
                          </Button>
                        </Grid>
                        <Grid item>
                          <IconButton aria-label="delete" onClick={() => removeRole(role)}>
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                      <List dense>
                        {role.shifts.map(shift => (
                          <ListItem key={shift.id} secondaryAction={
                            <Stack direction="row" spacing={1}>
                              <Switch
                                checked={shift.is_active}
                                onChange={e => toggleShift(shift.id, e.target.checked)}
                                inputProps={{ 'aria-label': 'toggle active' }}
                              />
                              <IconButton
                                aria-label="edit"
                                onClick={() =>
                                  openRoleDialog({
                                    slotId: shift.id,
                                    roleName: role.name,
                                    startTime: shift.start_time,
                                    endTime: shift.end_time,
                                    maxVolunteers: role.max_volunteers.toString(),
                                    categoryId: master.id,
                                    isWednesdaySlot: shift.is_wednesday_slot,
                                  })
                                }
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton aria-label="delete" onClick={() => removeShift(shift.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          }>
                            <ListItemText
                              primary={`${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`}
                              secondary={`Max volunteers: ${role.max_volunteers}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openRoleDialog({ categoryId: master.id })}
                  >
                    Add Sub-role
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openMasterDialog()}
            >
              Add Master Role
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={masterDialog.open} onClose={() => setMasterDialog({ open: false, name: '' })} fullWidth>
        <DialogTitle>{masterDialog.id ? 'Edit Master Role' : 'Add Master Role'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={masterDialog.name}
            onChange={e => setMasterDialog({ ...masterDialog, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setMasterDialog({ open: false, name: '' })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveMasterRole}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ ...roleDialog, open: false })} fullWidth>
        <DialogTitle>{roleDialog.slotId ? 'Edit Role' : 'Add Role'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={roleDialog.roleName}
            onChange={e => setRoleDialog({ ...roleDialog, roleName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Start Time"
            fullWidth
            value={roleDialog.startTime}
            onChange={e => setRoleDialog({ ...roleDialog, startTime: e.target.value })}
            placeholder="09:00:00"
          />
          <TextField
            margin="dense"
            label="End Time"
            fullWidth
            value={roleDialog.endTime}
            onChange={e => setRoleDialog({ ...roleDialog, endTime: e.target.value })}
            placeholder="12:00:00"
          />
          <TextField
            margin="dense"
            label="Max Volunteers"
            fullWidth
            type="number"
            value={roleDialog.maxVolunteers}
            onChange={e => setRoleDialog({ ...roleDialog, maxVolunteers: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Category ID"
            fullWidth
            type="number"
            value={roleDialog.categoryId ?? ''}
            onChange={e => setRoleDialog({ ...roleDialog, categoryId: Number(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setRoleDialog({ ...roleDialog, open: false })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveRole}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={snack.open}
        severity={snack.severity}
        message={snack.message}
        onClose={() => setSnack({ ...snack, open: false })}
      />
    </Page>
  );
}
