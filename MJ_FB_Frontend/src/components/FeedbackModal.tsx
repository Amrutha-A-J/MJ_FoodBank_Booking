import type { AlertColor } from '@mui/material';
import { Dialog, DialogContent, DialogActions, Button, Alert } from '@mui/material';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: AlertColor;
}

export default function FeedbackModal({ open, onClose, message, severity = 'success' }: FeedbackModalProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <Alert severity={severity}>{message}</Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
