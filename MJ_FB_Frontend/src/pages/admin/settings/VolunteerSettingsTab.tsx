import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import MasterRoleDialog, { type MasterRole } from '../components/MasterRoleDialog';
import SubRoleDialog from '../components/SubRoleDialog';
import ShiftDialog from '../components/ShiftDialog';
import FormDialog from '../../../components/FormDialog';
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
} from '../../../api/volunteers';
import { formatTime } from '../../../utils/time';
import type { VolunteerRoleWithShifts } from '../../../types';

export default function VolunteerSettingsTab() {
  const [masterRoles, setMasterRoles] = useState<MasterRole[]>([]);
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [editingMasterRole, setEditingMasterRole] = useState<MasterRole | undefined>(undefined);

  const [subRoleDialogOpen, setSubRoleDialogOpen] = useState(false);
  const [subRoleCategoryId, setSubRoleCategoryId] = useState<number | undefined>(undefined);

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftDialogData, setShiftDialogData] = useState<{
    slotId?: number;
    roleId?: number;
    roleName: string;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: string;
    isWednesdaySlot?: boolean;
    categoryId?: number;
  }>({ roleName: '' });

  const [deleteMasterId, setDeleteMasterId] = useState<number | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<VolunteerRoleWithShifts | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | false>(false);
  const [restoreDialog, setRestoreDialog] = useState(false);

  const rolesByCategory = useMemo(() => {
    const map = new Map<number, VolunteerRoleWithShifts[]>();
    roles.forEach(role => {
      const arr = map.get(role.category_id);
      if (arr) arr.push(role);
      else map.set(role.category_id, [role]);
    });
    return map;
  }, [roles]);

  const loadData = useCallback(async (newId?: number) => {
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
          document
            .getElementById(`master-role-${newId}`)
            ?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (e) {
      setSnack({ open: true, message: 'Failed to load roles', severity: 'error' });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSnack(message: string, severity: 'success' | 'error' = 'success') {
    setSnack({ open: true, message, severity });
  }

  const openMasterDialog = useCallback((role?: MasterRole) => {
    setEditingMasterRole(role);
    setMasterDialogOpen(true);
  }, []);

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

  const handleMasterSave = useCallback(
    async (id: number | undefined, name: string) => {
      try {
        if (id) {
          await updateVolunteerMasterRole(id, name);
          handleSnack('Master role updated');
          setMasterDialogOpen(false);
          setEditingMasterRole(undefined);
          loadData();
        } else {
          const created = await createVolunteerMasterRole(name);
          handleSnack('Master role created');
          setMasterDialogOpen(false);
          setEditingMasterRole(undefined);
          setMasterRoles(prev => [...prev, created]);
          setExpanded(created.id);
          setTimeout(() => {
            document
              .getElementById(`master-role-${created.id}`)
              ?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (e) {
        handleSnack('Failed to save master role', 'error');
      }
    },
    [handleSnack, loadData],
  );

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

  function toTimeValue(t: string) {
    return t.length === 5 ? `${t}:00` : t;
  }

  const openSubRoleDialog = useCallback((categoryId: number) => {
    setSubRoleCategoryId(categoryId);
    setSubRoleDialogOpen(true);
  }, []);

  const openShiftDialog = useCallback(
    (
      categoryId: number,
      init: {
        slotId?: number;
        roleId?: number;
        roleName?: string;
        startTime?: string;
        endTime?: string;
        maxVolunteers?: number | string;
        isWednesdaySlot?: boolean;
      } = {},
    ) => {
      setShiftDialogData({
        slotId: init.slotId,
        roleId: init.roleId,
        roleName: init.roleName || '',
        startTime: init.startTime,
        endTime: init.endTime,
        maxVolunteers:
          typeof init.maxVolunteers === 'number'
            ? init.maxVolunteers.toString()
            : init.maxVolunteers || '1',
        isWednesdaySlot: init.isWednesdaySlot || false,
        categoryId,
      });
      setShiftDialogOpen(true);
    },
    [],
  );

  const handleMasterClose = useCallback(() => {
    setMasterDialogOpen(false);
    setEditingMasterRole(undefined);
  }, []);

  const handleSubRoleClose = useCallback(() => {
    setSubRoleDialogOpen(false);
    setSubRoleCategoryId(undefined);
  }, []);

  const handleShiftClose = useCallback(() => {
    setShiftDialogOpen(false);
    setShiftDialogData({ roleName: '' });
  }, []);

  const handleSubRoleSave = useCallback(
    async (
      data: {
        roleName: string;
        startTime: string;
        endTime: string;
        maxVolunteers: string;
        isWednesdaySlot: boolean;
      },
    ) => {
      try {
        const startTime = toTimeValue(data.startTime);
        const endTime = toTimeValue(data.endTime);
        const maxVolunteers = Number(data.maxVolunteers);
        await createVolunteerRole(
          undefined,
          data.roleName,
          subRoleCategoryId!,
          startTime,
          endTime,
          maxVolunteers,
          data.isWednesdaySlot,
          true,
        );
        handleSnack('Sub-role created');
        setSubRoleDialogOpen(false);
        setSubRoleCategoryId(undefined);
        loadData();
      } catch (e) {
        handleSnack(
          e instanceof Error ? e.message : 'Failed to save sub-role',
          'error',
        );
      }
    },
    [subRoleCategoryId, handleSnack, loadData],
  );

  const handleShiftSave = useCallback(
    async (data: { startTime: string; endTime: string; maxVolunteers: string }) => {
      try {
        const startTime = toTimeValue(data.startTime);
        const endTime = toTimeValue(data.endTime);
        const maxVolunteers = Number(data.maxVolunteers);
        if (shiftDialogData.slotId) {
          await updateVolunteerRole(shiftDialogData.slotId, {
            name: shiftDialogData.roleName,
            startTime,
            endTime,
            maxVolunteers,
            categoryId: shiftDialogData.categoryId!,
            isWednesdaySlot: shiftDialogData.isWednesdaySlot || false,
          });
          handleSnack('Shift updated');
        } else if (shiftDialogData.roleId) {
          await createVolunteerRole(
            shiftDialogData.roleId,
            undefined,
            undefined,
            startTime,
            endTime,
            maxVolunteers,
            shiftDialogData.isWednesdaySlot || false,
            true,
          );
          handleSnack('Shift added');
        }
        setShiftDialogOpen(false);
        setShiftDialogData({ roleName: '' });
        loadData();
      } catch (e) {
        handleSnack(
          e instanceof Error ? e.message : 'Failed to save shift',
          'error',
        );
      }
    },
    [shiftDialogData, handleSnack, loadData],
  );

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
    <>
      <Box p={2}>
        <Box mb={2}>
          <Stack direction="row" spacing={1}>
            <Button
              
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openMasterDialog()}
            >
              Add Master Role
            </Button>
            <Button
              
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
                    component="span"
                    aria-label="edit"
                    onClick={e => {
                      e.stopPropagation();
                      openMasterDialog(master);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    component="span"
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
                    
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openSubRoleDialog(master.id)}
                  >
                    Add Sub-role
                  </Button>
                </Box>
                {(rolesByCategory.get(master.id) || []).map(role => (
                  <Box key={role.id} mb={2}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid size="grow">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {role.name}
                        </Typography>
                      </Grid>
                      <Grid>
                        <Button
                          
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() =>
                            openShiftDialog(master.id, {
                              roleId: role.id,
                              roleName: role.name,
                              maxVolunteers: role.max_volunteers,
                            })
                          }
                        >
                          Add Shift
                        </Button>
                      </Grid>
                      <Grid>
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
                                    maxVolunteers: role.max_volunteers,
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

      <MasterRoleDialog
        open={masterDialogOpen}
        role={editingMasterRole}
        onClose={handleMasterClose}
        onSave={handleMasterSave}
      />
      <SubRoleDialog
        open={subRoleDialogOpen}
        onClose={handleSubRoleClose}
        onSave={handleSubRoleSave}
      />
      <ShiftDialog
        open={shiftDialogOpen}
        initial={shiftDialogData}
        onClose={handleShiftClose}
        onSave={handleShiftSave}
      />

      <FormDialog open={roleToDelete !== null} onClose={() => setRoleToDelete(null)} maxWidth="xs">
        <DialogTitle>Delete role</DialogTitle>
        <DialogContent>
          <Typography>Deleting this role will remove all shifts. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleToDelete(null)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmRemoveRole}>
            Delete
          </Button>
        </DialogActions>
      </FormDialog>

      <FormDialog open={shiftToDelete !== null} onClose={() => setShiftToDelete(null)} maxWidth="xs">
        <DialogTitle>Delete shift</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this shift?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShiftToDelete(null)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmRemoveShift}>
            Delete
          </Button>
        </DialogActions>
      </FormDialog>

      <FormDialog open={deleteMasterId !== null} onClose={() => setDeleteMasterId(null)} maxWidth="xs">
        <DialogTitle>Delete master role</DialogTitle>
        <DialogContent>
          <Typography>Deleting this master role will remove all sub roles and shifts. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteMasterId(null)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmRemoveMasterRole}>
            Delete
          </Button>
        </DialogActions>
      </FormDialog>

      <FormDialog open={restoreDialog} onClose={() => setRestoreDialog(false)} maxWidth="xs">
        <DialogTitle>Restore roles?</DialogTitle>
        <DialogContent>
          <Typography>
            All current roles and shifts will be replaced with the defaults. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRestoreRoles}>
            Restore
          </Button>
        </DialogActions>
      </FormDialog>

      <FeedbackSnackbar
        open={snack.open}
        severity={snack.severity}
        message={snack.message}
        onClose={() => setSnack({ ...snack, open: false })}
      />
    </>
  );
}
