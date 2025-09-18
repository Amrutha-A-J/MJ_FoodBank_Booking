import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Link } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';

const STORAGE_KEY = 'privacy_consent';

export default function PrivacyNoticeModal() {
  if (process.env.NODE_ENV === 'test') return null;
  const [open, setOpen] = useState(false);
  const hasPersisted = useRef(false);

  const persistConsent = useCallback(async () => {
    if (hasPersisted.current) return;
    hasPersisted.current = true;
    try {
      const { setUserConsent } = await import('../api/users');
      await setUserConsent(true);
    } catch {}
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const handleClose = useCallback(async () => {
    await persistConsent();
    setOpen(false);
  }, [persistConsent]);

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

  return (
    <Dialog
      open={open}
      onClose={() => {
        void handleClose();
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        Privacy notice
        <DialogCloseButton
          onClose={() => {
            void handleClose();
          }}
        />
      </DialogTitle>
      <DialogContent>
        <Typography>
          By using this app, you agree to our <Link href="/privacy">privacy policy</Link>.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

