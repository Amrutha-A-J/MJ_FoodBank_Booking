import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

export interface RoleSelectionGroup {
  category: string;
  roles: {
    name: string;
    role_id: number;
    has_shifts?: boolean;
    category_id?: number;
  }[];
}

interface RoleSelectionDialogProps {
  open: boolean;
  groupedRoles: RoleSelectionGroup[];
  selectedRoles: string[];
  onCancel: () => void;
  onConfirm: (roles: string[]) => void;
  title?: string;
  description?: string;
  dialogId?: string;
}

function toIdFragment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

export default function RoleSelectionDialog({
  open,
  groupedRoles,
  selectedRoles,
  onCancel,
  onConfirm,
  title = 'Select Roles',
  description = 'Choose all roles that apply. Use the checkboxes to add or remove roles.',
  dialogId,
}: RoleSelectionDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [localSelection, setLocalSelection] = useState<string[]>(selectedRoles);

  useEffect(() => {
    if (open) {
      setLocalSelection(selectedRoles);
    }
  }, [open, selectedRoles]);

  const idPrefix = dialogId ?? 'role-selection-dialog';
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;

  const handleToggle = (roleName: string) => {
    setLocalSelection(prev =>
      prev.includes(roleName)
        ? prev.filter(name => name !== roleName)
        : [...prev, roleName],
    );
  };

  const orderedSelection = useMemo(() => {
    if (groupedRoles.length === 0) {
      return [...localSelection];
    }
    const current = new Set(localSelection);
    const ordered = groupedRoles.flatMap(group =>
      group.roles
        .map(role => role.name)
        .filter(name => current.has(name)),
    );
    if (ordered.length === localSelection.length) {
      return ordered;
    }
    const remaining = localSelection.filter(name => !ordered.includes(name));
    return [...ordered, ...remaining];
  }, [groupedRoles, localSelection]);

  const handleConfirm = () => {
    onConfirm(orderedSelection);
  };

  return (
    <Dialog
      id={dialogId}
      open={open}
      onClose={onCancel}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        {groupedRoles.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No roles available.
          </Typography>
        ) : (
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {groupedRoles.flatMap(group => {
              const categoryId = toIdFragment(group.category);
              return [
                <ListSubheader key={`${categoryId}-header`} component="div">
                  {group.category}
                </ListSubheader>,
                ...group.roles.map(role => {
                  const labelId = `${idPrefix}-${categoryId}-${role.role_id}`;
                  return (
                    <ListItem key={`${categoryId}-${role.role_id}`} disablePadding>
                      <ListItemButton onClick={() => handleToggle(role.name)} dense>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={localSelection.includes(role.name)}
                            tabIndex={-1}
                            disableRipple
                            inputProps={{ 'aria-labelledby': labelId }}
                          />
                        </ListItemIcon>
                        <ListItemText id={labelId} primary={role.name} />
                      </ListItemButton>
                    </ListItem>
                  );
                }),
              ];
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={groupedRoles.length === 0}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
