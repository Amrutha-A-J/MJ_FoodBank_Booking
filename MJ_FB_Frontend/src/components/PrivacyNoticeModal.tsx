import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Link } from '@mui/material';

const STORAGE_KEY = 'privacy_consent';

export default function PrivacyNoticeModal() {
  if (process.env.NODE_ENV === 'test') return null;
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return;
    import('../api/users')
      .then(({ getUserProfile }) =>
        getUserProfile()
          .then(p => {
            if (p.consent) {
              localStorage.setItem(STORAGE_KEY, 'true');
            } else {
              setOpen(true);
            }
          })
          .catch(() => {}),
      )
      .catch(() => {});
  }, []);

  const handleAgree = async () => {
    try {
      const { setUserConsent } = await import('../api/users');
      await setUserConsent(true);
    } catch {}
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return;
        handleAgree();
      }}
      disableEscapeKeyDown
    >
      <DialogTitle>{"Notice"}</DialogTitle>
      <DialogContent>
        <Typography>
          {"This app uses basic analytics to improve the service. Read our"}{' '}
          <Link href="/privacy">{"privacy policy"}</Link>.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleAgree} sx={{ textTransform: 'none' }}>
          {"Agree"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

