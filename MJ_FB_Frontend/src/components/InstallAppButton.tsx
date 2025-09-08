import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function InstallAppButton() {
  const { t } = useTranslation();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  if (!promptEvent) {
    return null;
  }

  const handleClick = async () => {
    await promptEvent.prompt();
    setPromptEvent(null);
  };

  return (
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
  );
}
