import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

interface PasswordChecklistProps {
  password: string;
}

export default function PasswordChecklist({ password }: PasswordChecklistProps) {
  const { t } = useTranslation();

  const rules = [
    {
      id: 'min_length',
      valid: password.length >= 8,
      label: t('profile_page.password_checklist.min_length'),
    },
    {
      id: 'uppercase',
      valid: /[A-Z]/.test(password),
      label: t('profile_page.password_checklist.uppercase'),
    },
    {
      id: 'lowercase',
      valid: /[a-z]/.test(password),
      label: t('profile_page.password_checklist.lowercase'),
    },
    {
      id: 'symbol',
      valid: /[^A-Za-z0-9]/.test(password),
      label: t('profile_page.password_checklist.symbol'),
    },
  ];

  return (
    <List dense>
      {rules.map(rule => (
        <ListItem key={rule.id}>
          <ListItemIcon>
            {rule.valid ? (
              <CheckIcon color="success" data-testid={`${rule.id}-check`} />
            ) : (
              <CloseIcon color="error" data-testid={`${rule.id}-close`} />
            )}
          </ListItemIcon>
          <ListItemText primary={rule.label} />
        </ListItem>
      ))}
    </List>
  );
}
