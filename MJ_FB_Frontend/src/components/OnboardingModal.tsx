import { useEffect, useState } from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import FormDialog from './FormDialog';

interface OnboardingModalProps {
  storageKey: string;
  title: string;
  body: string;
}

export default function OnboardingModal({ storageKey, title, body }: OnboardingModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setOpen(true);
    }
  }, [storageKey]);

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
  };

  return (
    <FormDialog open={open} onClose={handleClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{body}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </FormDialog>
  );
}

