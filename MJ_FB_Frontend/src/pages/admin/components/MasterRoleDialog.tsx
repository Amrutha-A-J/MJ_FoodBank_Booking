import { memo, useEffect, useState } from 'react';
import { DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import FormDialog from '../../../components/FormDialog';

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
    <FormDialog open={open} onClose={onClose}>
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
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave(role?.id, name)}>
          Save
        </Button>
      </DialogActions>
    </FormDialog>
  );
}

export default memo(MasterRoleDialog);
