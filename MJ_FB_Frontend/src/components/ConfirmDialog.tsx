import type { ReactNode } from 'react';
import { DialogActions, DialogContent, Button, Typography } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import FormDialog from './FormDialog';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({ message, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <FormDialog open onClose={onCancel} maxWidth="xs">
      <DialogCloseButton onClose={onCancel} />
      <DialogContent>
        <Typography>{message}</Typography>
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} variant="outlined" color="primary">Confirm</Button>
      </DialogActions>
    </FormDialog>
  );
}
