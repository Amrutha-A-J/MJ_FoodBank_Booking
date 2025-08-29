import { memo, useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';

export type MasterRole = { id: number; name: string };

interface MasterRoleDialogProps {
  open: boolean;
  role?: MasterRole;
  onClose: () => void;
  onSave: (id: number | undefined, name: string) => void;
}

function MasterRoleDialog({ open, role, onClose, onSave }: MasterRoleDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(role?.name || '');
    }
  }, [open, role]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{role ? 'Edit Master Role' : 'Add Master Role'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={() => onSave(role?.id, name)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default memo(MasterRoleDialog);
