import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface PasswordChecklistProps {
  password: string;
}

export default function PasswordChecklist({ password }: PasswordChecklistProps) {
  
  const rules = [
    {
      id: 'min_length',
      valid: password.length >= 8,
      label: "≥8 characters",
    },
    {
      id: 'uppercase',
      valid: /[A-Z]/.test(password),
      label: "Uppercase letter",
    },
    {
      id: 'lowercase',
      valid: /[a-z]/.test(password),
      label: "Lowercase letter",
    },
    {
      id: 'symbol',
      valid: /[^A-Za-z0-9]/.test(password),
      label: "Symbol",
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
