import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function InstallAppButton() {
  const { t } = useTranslation();
  const location = useLocation();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  useEffect(() => {
    if (promptEvent && location.pathname.startsWith('/volunteer')) {
      setShowPrompt(true);
      if (!localStorage.getItem('pwaPromptShown')) {
        setShowOnboarding(true);
        localStorage.setItem('pwaPromptShown', 'true');
      }
    } else {
      setShowPrompt(false);
    }
  }, [location, promptEvent]);

  useEffect(() => {
    const handler = () => {
      navigator.sendBeacon('/api/pwa-install');
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  if (!showPrompt || !promptEvent) {
    return null;
  }

  const handleClick = async () => {
    await promptEvent.prompt();
    setPromptEvent(null);
    setShowPrompt(false);
  };

  return (
    <>
      {showOnboarding && (
        <Dialog open onClose={() => setShowOnboarding(false)}>
          <DialogTitle sx={{ textTransform: 'none' }}>{t('install_app')}</DialogTitle>
          <DialogContent>
            <Typography>
              Install this app to access volunteer tools offline.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              size="small"
              onClick={() => setShowOnboarding(false)}
              sx={{ textTransform: 'none' }}
            >
              Not now
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setShowOnboarding(false);
                handleClick();
              }}
              sx={{ textTransform: 'none' }}
            >
              {t('install_app')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleClick}
          sx={{ textTransform: 'none' }}
        >
          {t('install_app')}
        </Button>
      </Box>
    </>
  );
}
