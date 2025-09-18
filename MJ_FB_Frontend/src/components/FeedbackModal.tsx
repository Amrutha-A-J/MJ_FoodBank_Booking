import type { AlertColor } from '@mui/material';
import { DialogContent, Alert } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import type { ReactNode } from 'react';
import FormDialog from './FormDialog';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  message: ReactNode;
  severity?: AlertColor;
}

export default function FeedbackModal({ open, onClose, message, severity = 'success' }: FeedbackModalProps) {
  return (
    <FormDialog open={open} onClose={onClose} maxWidth="xs">
      <DialogCloseButton onClose={onClose} />
      <DialogContent>
        <Alert severity={severity}>{message}</Alert>
      </DialogContent>
    </FormDialog>
  );
}
