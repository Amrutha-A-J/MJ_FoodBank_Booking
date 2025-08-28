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
  restoreVolunteerRoles,
} from '../../api/volunteers';
import { formatTime } from '../../utils/time';
import type { VolunteerRoleWithShifts } from '../../types';

type MasterRole = { id: number; name: string };

export default function VolunteerSettings() {
  const [masterRoles, setMasterRoles] = useState<MasterRole[]>([]);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const [masterDialog, setMasterDialog] = useState<{ open: boolean; id?: number; name: string }>({ open: false, name: '' });
  const [subRoleDialog, setSubRoleDialog] = useState<{
    open: boolean;
    roleName: string;
    startTime: string;
    endTime: string;
    maxVolunteers: string;
    categoryId?: number;
    isWednesdaySlot: boolean;
  }>({ open: false, roleName: '', startTime: '', endTime: '', maxVolunteers: '1', isWednesdaySlot: false });
  const [shiftDialog, setShiftDialog] = useState<{
    open: boolean;
    slotId?: number;
    roleId?: number;
    roleName: string;
    startTime: string;
    endTime: string;
    maxVolunteers: string;
    categoryId?: number;
    isWednesdaySlot: boolean;
  }>({ open: false, roleName: '', startTime: '', endTime: '', maxVolunteers: '1', isWednesdaySlot: false });

  const [subRoleErrors, setSubRoleErrors] = useState({
    roleName: '',
    startTime: '',
    endTime: '',
    maxVolunteers: '',
  });
  const [shiftErrors, setShiftErrors] = useState({
    startTime: '',
    endTime: '',
    maxVolunteers: '',
  });

  const [deleteMasterId, setDeleteMasterId] = useState<number | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<VolunteerRoleWithShifts | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | false>(false);
  const [restoreDialog, setRestoreDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(newId?: number) {
    try {
      const [master, roleData] = await Promise.all([
        getVolunteerMasterRoles(),
        getVolunteerRoles(true),
      ]);
      setMasterRoles(master);
      setRoles(roleData);
      if (newId) {
        setExpanded(newId);
        setTimeout(() => {
          document.getElementById(`master-role-${newId}`)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
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

  async function handleRestoreRoles() {
    try {
      await restoreVolunteerRoles();
      handleSnack('Roles restored');
      setRestoreDialog(false);
      loadData();
    } catch (e) {
      handleSnack('Failed to restore roles', 'error');
      setRestoreDialog(false);
    }
  }

  async function saveMasterRole() {
    try {
      if (masterDialog.id) {
        await updateVolunteerMasterRole(masterDialog.id, masterDialog.name);
        handleSnack('Master role updated');
        setMasterDialog({ open: false, name: '' });
        loadData();
      } else {
        const created = await createVolunteerMasterRole(masterDialog.name);
        handleSnack('Master role created');
        setMasterDialog({ open: false, name: '' });
        setMasterRoles(prev => [...prev, created]);
        setExpanded(created.id);
        setTimeout(() => {
          document.getElementById(`master-role-${created.id}`)?.scrollIntoView({
            behavior: 'smooth',
          });
        }, 100);
      }
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

  function openSubRoleDialog(categoryId: number) {
    setSubRoleDialog({
      open: true,
      roleName: '',
      startTime: '',
      endTime: '',
      maxVolunteers: '1',
      categoryId,
      isWednesdaySlot: false,
    });
    setSubRoleErrors({ roleName: '', startTime: '', endTime: '', maxVolunteers: '' });
  }

  function openShiftDialog(
    categoryId: number,
    init: Partial<Omit<typeof shiftDialog, 'categoryId' | 'open'>> = {},
  ) {
    setShiftDialog({
      open: true,
      slotId: init.slotId,
      roleId: init.roleId,
      roleName: init.roleName || '',
      startTime: init.startTime ? toTimeInput(init.startTime) : '',
      endTime: init.endTime ? toTimeInput(init.endTime) : '',
      maxVolunteers: init.maxVolunteers?.toString() || '1',
      categoryId,
      isWednesdaySlot: init.isWednesdaySlot || false,
    });
    setShiftErrors({ startTime: '', endTime: '', maxVolunteers: '' });
  }

  async function saveSubRole() {
    try {
      const errors = {
        roleName: subRoleDialog.roleName ? '' : 'Required',
        startTime: subRoleDialog.startTime ? '' : 'Required',
        endTime: subRoleDialog.endTime ? '' : 'Required',
        maxVolunteers: subRoleDialog.maxVolunteers ? '' : 'Required',
      };
      setSubRoleErrors(errors);
      if (Object.values(errors).some(Boolean)) return;
      const startTime = toTimeValue(subRoleDialog.startTime);
      const endTime = toTimeValue(subRoleDialog.endTime);
      const maxVolunteers = Number(subRoleDialog.maxVolunteers);
      await createVolunteerRole(
        undefined,
        subRoleDialog.roleName,
        subRoleDialog.categoryId!,
        startTime,
        endTime,
        maxVolunteers,
        subRoleDialog.isWednesdaySlot,
        true,
      );
      handleSnack('Sub-role created');
      setSubRoleDialog({
        open: false,
        roleName: '',
        startTime: '',
        endTime: '',
        maxVolunteers: '1',
        isWednesdaySlot: false,
        categoryId: undefined,
      });
      setSubRoleErrors({ roleName: '', startTime: '', endTime: '', maxVolunteers: '' });
      loadData();
    } catch (e) {
      handleSnack(
        e instanceof Error ? e.message : 'Failed to save sub-role',
        'error',
      );
    }
  }

  async function saveShift() {
    try {
      const errors = {
        startTime: shiftDialog.startTime ? '' : 'Required',
        endTime: shiftDialog.endTime ? '' : 'Required',
        maxVolunteers: shiftDialog.maxVolunteers ? '' : 'Required',
      };
      setShiftErrors(errors);
      if (Object.values(errors).some(Boolean)) return;
      const startTime = toTimeValue(shiftDialog.startTime);
      const endTime = toTimeValue(shiftDialog.endTime);
      const maxVolunteers = Number(shiftDialog.maxVolunteers);
      if (shiftDialog.slotId) {
        await updateVolunteerRole(shiftDialog.slotId, {
          name: shiftDialog.roleName,
          startTime,
          endTime,
          maxVolunteers,
          categoryId: shiftDialog.categoryId!,
          isWednesdaySlot: shiftDialog.isWednesdaySlot,
        });
        handleSnack('Shift updated');
      } else if (shiftDialog.roleId) {
        await createVolunteerRole(
          shiftDialog.roleId,
          undefined,
          undefined,
          startTime,
          endTime,
          maxVolunteers,
          shiftDialog.isWednesdaySlot,
          true,
        );
        handleSnack('Shift added');
      }
      setShiftDialog({
        open: false,
        roleName: '',
        startTime: '',
        endTime: '',
        maxVolunteers: '1',
        isWednesdaySlot: false,
        roleId: undefined,
        categoryId: undefined,
      });
      setShiftErrors({ startTime: '', endTime: '', maxVolunteers: '' });
      loadData();
    } catch (e) {
      handleSnack(
        e instanceof Error ? e.message : 'Failed to save shift',
        'error',
      );
    }
  }

  function removeRole(role: VolunteerRoleWithShifts) {
    setRoleToDelete(role);
  }

  async function confirmRemoveRole() {
    if (!roleToDelete) return;
    try {
      for (const shift of roleToDelete.shifts) {
        await deleteVolunteerRole(shift.id);
      }
      handleSnack('Role deleted');
      loadData();
    } catch (e) {
      handleSnack('Failed to delete role', 'error');
    } finally {
      setRoleToDelete(null);
    }
  }

  function removeShift(id: number) {
    setShiftToDelete(id);
  }

  async function confirmRemoveShift() {
    if (shiftToDelete == null) return;
    try {
      await deleteVolunteerRole(shiftToDelete);
      handleSnack('Shift deleted');
      loadData();
    } catch (e) {
      handleSnack('Failed to delete shift', 'error');
    } finally {
      setShiftToDelete(null);
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
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openMasterDialog()}
            >
              Add Master Role
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRestoreDialog(true)}
            >
              Restore Original Roles & Shifts
            </Button>
          </Stack>
        </Box>
        <Box>
          {masterRoles.map(master => (
            <Accordion
              key={master.id}
              id={`master-role-${master.id}`}
              disableGutters
              square
              sx={{
                width: '100%',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                border: 1,
                borderColor: expanded === master.id ? 'primary.main' : 'divider',
                borderRadius: 1,
              }}
              expanded={expanded === master.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? master.id : false)}
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
              <AccordionDetails sx={{ borderTop: 1, borderColor: 'divider' }}>
                <Box mb={2}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openSubRoleDialog(master.id)}
                  >
                    Add Sub-role
                  </Button>
                </Box>
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
                          onClick={() =>
                            openShiftDialog(master.id, {
                              roleId: role.id,
                              roleName: role.name,
                              maxVolunteers: role.max_volunteers.toString(),
                            })
                          }
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
                                  openShiftDialog(master.id, {
                                    roleId: role.id,
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
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
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

      <Dialog
        open={subRoleDialog.open}
        onClose={() => setSubRoleDialog({ ...subRoleDialog, open: false })}
        fullWidth
      >
        <DialogTitle>Add Sub-role</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={subRoleDialog.roleName}
            onChange={e => {
              setSubRoleDialog({ ...subRoleDialog, roleName: e.target.value });
              if (subRoleErrors.roleName) setSubRoleErrors({ ...subRoleErrors, roleName: '' });
            }}
            error={Boolean(subRoleErrors.roleName)}
            helperText={subRoleErrors.roleName}
          />
          <TextField
            margin="dense"
            label="Start Time"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={subRoleDialog.startTime}
            onChange={e => {
              setSubRoleDialog({ ...subRoleDialog, startTime: e.target.value });
              if (subRoleErrors.startTime) setSubRoleErrors({ ...subRoleErrors, startTime: '' });
            }}
            error={Boolean(subRoleErrors.startTime)}
            helperText={subRoleErrors.startTime}
          />
          <TextField
            margin="dense"
            label="End Time"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={subRoleDialog.endTime}
            onChange={e => {
              setSubRoleDialog({ ...subRoleDialog, endTime: e.target.value });
              if (subRoleErrors.endTime) setSubRoleErrors({ ...subRoleErrors, endTime: '' });
            }}
            error={Boolean(subRoleErrors.endTime)}
            helperText={subRoleErrors.endTime}
          />
          <TextField
            margin="dense"
            label="Max Volunteers"
            fullWidth
            type="number"
            value={subRoleDialog.maxVolunteers}
            onChange={e => {
              setSubRoleDialog({ ...subRoleDialog, maxVolunteers: e.target.value });
              if (subRoleErrors.maxVolunteers) setSubRoleErrors({ ...subRoleErrors, maxVolunteers: '' });
            }}
            error={Boolean(subRoleErrors.maxVolunteers)}
            helperText={subRoleErrors.maxVolunteers}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setSubRoleDialog({ ...subRoleDialog, open: false })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveSubRole}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={shiftDialog.open}
        onClose={() => setShiftDialog({ ...shiftDialog, open: false })}
        fullWidth
      >
        <DialogTitle>{shiftDialog.slotId ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={shiftDialog.roleName}
            disabled
          />
          <TextField
            margin="dense"
            label="Start Time"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={shiftDialog.startTime}
            onChange={e => {
              setShiftDialog({ ...shiftDialog, startTime: e.target.value });
              if (shiftErrors.startTime) setShiftErrors({ ...shiftErrors, startTime: '' });
            }}
            error={Boolean(shiftErrors.startTime)}
            helperText={shiftErrors.startTime}
          />
          <TextField
            margin="dense"
            label="End Time"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={shiftDialog.endTime}
            onChange={e => {
              setShiftDialog({ ...shiftDialog, endTime: e.target.value });
              if (shiftErrors.endTime) setShiftErrors({ ...shiftErrors, endTime: '' });
            }}
            error={Boolean(shiftErrors.endTime)}
            helperText={shiftErrors.endTime}
          />
          <TextField
            margin="dense"
            label="Max Volunteers"
            fullWidth
            type="number"
            value={shiftDialog.maxVolunteers}
            onChange={e => {
              setShiftDialog({ ...shiftDialog, maxVolunteers: e.target.value });
              if (shiftErrors.maxVolunteers) setShiftErrors({ ...shiftErrors, maxVolunteers: '' });
            }}
            error={Boolean(shiftErrors.maxVolunteers)}
            helperText={shiftErrors.maxVolunteers}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setShiftDialog({ ...shiftDialog, open: false })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveShift}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={roleToDelete !== null} onClose={() => setRoleToDelete(null)}>
        <DialogTitle>Delete role</DialogTitle>
        <DialogContent>
          <Typography>Deleting this role will remove all shifts. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setRoleToDelete(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmRemoveRole}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shiftToDelete !== null} onClose={() => setShiftToDelete(null)}>
        <DialogTitle>Delete shift</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this shift?</Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setShiftToDelete(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmRemoveShift}>
            Delete
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

      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
        <DialogTitle>Restore roles?</DialogTitle>
        <DialogContent>
          <Typography>
            All current roles and shifts will be replaced with the defaults. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setRestoreDialog(false)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleRestoreRoles}>
            Restore
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
