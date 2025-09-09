import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface FeedbackPromptProps {
  open: boolean;
  onClose: () => void;
  formUrl?: string;
}

export default function FeedbackPrompt({ open, onClose, formUrl }: FeedbackPromptProps) {
  const { t } = useTranslation();
  const url = formUrl ?? import.meta.env.VITE_FEEDBACK_FORM_URL;
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('feedback_prompt_title')}</DialogTitle>
      <DialogContent>
        <Typography>{t('feedback_prompt_message')}</Typography>
      </DialogContent>
      <DialogActions>
        {url && (
          <Button
            component="a"
            href={url}
            target="_blank"
            rel="noopener"
            variant="contained"
            onClick={onClose}
            size="medium"
            sx={{ minHeight: 48 }}
          >
            {t('give_feedback')}
          </Button>
        )}
        <Button onClick={onClose} size="medium">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
