import type { AlertColor } from '@mui/material';
import { Dialog, DialogContent, Alert } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import type { ReactNode } from 'react';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  message: ReactNode;
  severity?: AlertColor;
}

export default function FeedbackModal({ open, onClose, message, severity = 'success' }: FeedbackModalProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogContent>
        <Alert severity={severity}>{message}</Alert>
      </DialogContent>
    </Dialog>
  );
}
