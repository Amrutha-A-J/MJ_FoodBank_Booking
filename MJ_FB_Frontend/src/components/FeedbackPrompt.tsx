import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import { useTranslation } from 'react-i18next';
import { logEvent } from '../analytics';

interface FeedbackPromptProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackPrompt({ open, onClose }: FeedbackPromptProps) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    logEvent('feedback_submit');
    setSubmitted(true);
    setFeedback('');
    onClose();
  }

  return (
    <>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>{t('feedback_prompt.title')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('feedback_prompt.placeholder')}
            multiline
            fullWidth
            minRows={3}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {t('feedback_prompt.submit')}
          </Button>
        </DialogActions>
      </Dialog>
      <FeedbackSnackbar
        open={submitted}
        onClose={() => setSubmitted(false)}
        message={t('feedback_prompt.thanks')}
        severity="success"
      />
    </>
  );
}
