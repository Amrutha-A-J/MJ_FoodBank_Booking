import type { ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, Button, Typography } from '@mui/material';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({ message, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Dialog open onClose={onCancel}>
      <DialogContent>
        <Typography>{message}</Typography>
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} variant="outlined" color="primary">Confirm</Button>
        <Button onClick={onCancel} variant="outlined" color="primary">Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
