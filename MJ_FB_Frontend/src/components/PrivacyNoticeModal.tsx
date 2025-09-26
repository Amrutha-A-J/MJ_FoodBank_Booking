import { useCallback, useEffect, useRef, useState } from 'react';
import { DialogTitle, DialogContent, Typography, Link } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import FormDialog from './FormDialog';

const STORAGE_KEY = 'privacy_consent';

export default function PrivacyNoticeModal() {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const [open, setOpen] = useState(isTestEnv);
  const hasPersisted = useRef(false);

  const persistConsent = useCallback(
    async ({ skipRemote = false }: { skipRemote?: boolean } = {}) => {
      if (hasPersisted.current) return;
      hasPersisted.current = true;
      if (!skipRemote && !isTestEnv) {
        try {
          const { setUserConsent } = await import('../api/users');
          await setUserConsent(true);
        } catch {}
      }
      localStorage.setItem(STORAGE_KEY, 'true');
    },
    [isTestEnv],
  );

  const handleClose = useCallback(async () => {
    await persistConsent();
    setOpen(false);
  }, [persistConsent]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      void persistConsent({ skipRemote: true });
      setOpen(false);
      return;
    }
    if (isTestEnv) {
      setOpen(true);
      return;
    }

    let cancelled = false;

    import('../api/users')
      .then(({ getUserProfile }) =>
        getUserProfile()
          .then(profile => {
            if (cancelled) return;
            if (profile.consent) {
              void persistConsent({ skipRemote: true });
              setOpen(false);
            } else {
              setOpen(true);
            }
          })
          .catch(() => {}),
      )
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isTestEnv, persistConsent]);

  return (
    <FormDialog
      open={open}
      onClose={() => {
        void handleClose();
      }}
      maxWidth="xs"
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
    </FormDialog>
  );
}

