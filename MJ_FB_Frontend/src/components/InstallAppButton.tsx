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
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone
    ) {
      setInstalled(true);
    }
  }, []);

  useEffect(() => {
    if (
      location.pathname.startsWith('/volunteer') &&
      !installed &&
      (promptEvent || isIOS)
    ) {
      setShowPrompt(true);
      if (!localStorage.getItem('pwaPromptShown')) {
        setShowOnboarding(true);
        localStorage.setItem('pwaPromptShown', 'true');
      }
    } else {
      setShowPrompt(false);
    }
  }, [location, promptEvent, isIOS, installed]);

  useEffect(() => {
    const handler = () => {
      navigator.sendBeacon('/api/v1/pwa-install');
      setInstalled(true);
      setShowPrompt(false);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  if (!showPrompt || installed) {
    return null;
  }

  const handleClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      setPromptEvent(null);
      setShowPrompt(false);
    } else if (isIOS) {
      setShowIosInstructions(true);
    }
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
              
              onClick={() => setShowOnboarding(false)}
              sx={{ textTransform: 'none' }}
            >
              Not now
            </Button>
            <Button
              variant="contained"
              
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
      {showIosInstructions && (
        <Dialog open onClose={() => setShowIosInstructions(false)}>
          <DialogTitle sx={{ textTransform: 'none' }}>{t('install_app')}</DialogTitle>
          <DialogContent>
            <Typography>
              Open Safari&rsquo;s share menu and tap “Add to Home Screen”.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowIosInstructions(false)} sx={{ textTransform: 'none' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
        <Button
          variant="contained"
          
          onClick={handleClick}
          sx={{ textTransform: 'none' }}
        >
          {t('install_app')}
        </Button>
      </Box>
    </>
  );
}
