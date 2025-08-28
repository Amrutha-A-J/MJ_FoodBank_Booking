import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

  const [deleteMasterId, setDeleteMasterId] = useState<number | null>(null);
  const [expandedMasters, setExpandedMasters] = useState<Record<number, boolean>>({});

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
        setMasterRoles(prev => prev.map(m => (m.id === masterDialog.id ? { ...m, name: masterDialog.name } : m)));
        handleSnack('Master role updated');
      } else {
        const newRole = await createVolunteerMasterRole(masterDialog.name);
        setMasterRoles(prev => [...prev, newRole]);
        setExpandedMasters(prev => ({ ...prev, [newRole.id]: true }));
        handleSnack('Master role created');
      }
      setMasterDialog({ open: false, name: '' });
    } catch (e) {
      handleSnack('Failed to save master role', 'error');
    }
  }

  function removeMasterRole(id: number) {
    setDeleteMasterId(id);
  }

  async function confirmRemoveMasterRole() {
    if (deleteMasterId == null) return;
    try {
      await deleteVolunteerMasterRole(deleteMasterId);
      handleSnack('Master role deleted');
      loadData();
    } catch (e) {
      handleSnack('Failed to delete master role', 'error');
    } finally {
      setDeleteMasterId(null);
    }
  }

  function toTimeInput(t: string) {
    return t ? t.substring(0, 5) : '';
  }

  function toTimeValue(t: string) {
    return t.length === 5 ? `${t}:00` : t;
  }

  function openRoleDialog(
    categoryId: number,
    init: Partial<Omit<typeof roleDialog, 'categoryId' | 'open'>> = {},
  ) {
    setRoleDialog({
      open: true,
      slotId: init.slotId,
      roleName: init.roleName || '',
      startTime: init.startTime ? toTimeInput(init.startTime) : '',
      endTime: init.endTime ? toTimeInput(init.endTime) : '',
      maxVolunteers: init.maxVolunteers?.toString() || '1',
      categoryId,
      isWednesdaySlot: init.isWednesdaySlot || false,
    });
  }

  async function saveRole() {
    try {
      if (!roleDialog.roleName || !roleDialog.startTime || !roleDialog.endTime) {
        handleSnack('All fields are required', 'error');
        return;
      }
      const startTime = toTimeValue(roleDialog.startTime);
      const endTime = toTimeValue(roleDialog.endTime);
      const maxVolunteers = Number(roleDialog.maxVolunteers);
      if (roleDialog.slotId) {
        await updateVolunteerRole(roleDialog.slotId, {
          name: roleDialog.roleName,
          startTime,
          endTime,
          maxVolunteers,
          categoryId: roleDialog.categoryId!,
          isWednesdaySlot: roleDialog.isWednesdaySlot,
        });
        handleSnack('Role updated');
      } else {
        await createVolunteerRole(
          roleDialog.roleName,
          startTime,
          endTime,
          maxVolunteers,
          roleDialog.categoryId!,
          roleDialog.isWednesdaySlot,
          true,
        );
        handleSnack('Role created');
      }
      setRoleDialog({ open: false, roleName: '', startTime: '', endTime: '', maxVolunteers: '1', isWednesdaySlot: false });
      loadData();
    } catch (e) {
      handleSnack('Failed to save role', 'error');
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
        <Box mb={2}>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openMasterDialog()}
          >
            Add Master Role
          </Button>
        </Box>
        <Grid container spacing={2}>
          {masterRoles.map(master => (
            <Grid item xs={12} key={master.id}>
              <Accordion
                expanded={!!expandedMasters[master.id]}
                onChange={(_e, isExpanded) =>
                  setExpandedMasters(prev => ({ ...prev, [master.id]: isExpanded }))
                }
                sx={{ width: '100%' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ flexGrow: 1 }}>{master.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      aria-label="edit"
                      onClick={e => {
                        e.stopPropagation();
                        openMasterDialog(master);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label="delete"
                      onClick={e => {
                        e.stopPropagation();
                        removeMasterRole(master.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
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
                            onClick={() => openRoleDialog(master.id, { roleName: role.name })}
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
                          <ListItem
                            key={shift.id}
                            secondaryAction={
                              <Stack direction="row" spacing={1}>
                                <Switch
                                  checked={shift.is_active}
                                  onChange={e => toggleShift(shift.id, e.target.checked)}
                                  inputProps={{ 'aria-label': 'toggle active' }}
                                />
                                <IconButton
                                  aria-label="edit"
                                  onClick={() =>
                                    openRoleDialog(master.id, {
                                      slotId: shift.id,
                                      roleName: role.name,
                                      startTime: shift.start_time,
                                      endTime: shift.end_time,
                                      maxVolunteers: role.max_volunteers.toString(),
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
                            }
                          >
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
                    onClick={() => openRoleDialog(master.id)}
                  >
                    Add Sub-role
                  </Button>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
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
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={roleDialog.startTime}
            onChange={e => setRoleDialog({ ...roleDialog, startTime: e.target.value })}
          />
          <TextField
            margin="dense"
            label="End Time"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={roleDialog.endTime}
            onChange={e => setRoleDialog({ ...roleDialog, endTime: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Max Volunteers"
            fullWidth
            type="number"
            value={roleDialog.maxVolunteers}
            onChange={e => setRoleDialog({ ...roleDialog, maxVolunteers: e.target.value })}
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

      <Dialog open={deleteMasterId !== null} onClose={() => setDeleteMasterId(null)}>
        <DialogTitle>Delete master role</DialogTitle>
        <DialogContent>
          <Typography>Deleting this master role will remove all sub roles and shifts. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteMasterId(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmRemoveMasterRole}>
            Delete
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
