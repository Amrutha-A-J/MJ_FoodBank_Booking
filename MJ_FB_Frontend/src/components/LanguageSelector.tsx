import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', labelKey: 'english' },
  { code: 'es', labelKey: 'spanish' },
];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleChange = (e: SelectChangeEvent) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <Select
      value={i18n.language}
      onChange={handleChange}
      variant="standard"
      sx={{ minWidth: 80, color: 'inherit', '&::before, &::after': { borderBottom: 'none' } }}
      disableUnderline
    >
      {languages.map(lang => (
        <MenuItem key={lang.code} value={lang.code}>
          {t(lang.labelKey)}
        </MenuItem>
      ))}
    </Select>
  );
}
