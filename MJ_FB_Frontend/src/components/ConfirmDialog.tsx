import type { ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, Button, Typography } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({ message, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Dialog open onClose={onCancel}>
      <DialogCloseButton onClose={onCancel} />
      <DialogContent>
        <Typography>{message}</Typography>
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} variant="outlined" color="primary">Confirm</Button>
      </DialogActions>
    </Dialog>
  );
}
