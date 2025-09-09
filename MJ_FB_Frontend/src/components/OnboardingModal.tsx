import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import i18n from '../i18n';

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
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{body}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{i18n.t('onboarding.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

