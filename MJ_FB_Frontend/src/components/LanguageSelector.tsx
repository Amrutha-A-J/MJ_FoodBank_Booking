import { MenuItem, Select } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', labelKey: 'english' },
  { code: 'es', labelKey: 'spanish' },
  { code: 'fr', labelKey: 'french' },
  { code: 'ar', labelKey: 'arabic' },
  { code: 'uk', labelKey: 'ukrainian' },
  { code: 'so', labelKey: 'somali' },
  { code: 'tl', labelKey: 'tagalog' },
  { code: 'zh', labelKey: 'chinese' },
  { code: 'pa', labelKey: 'punjabi' },
  { code: 'hi', labelKey: 'hindi' },
  { code: 'fa', labelKey: 'persian' },
  { code: 'ps', labelKey: 'pashto' },
  { code: 'ti', labelKey: 'tigrinya' },
  { code: 'am', labelKey: 'amharic' },
  { code: 'sw', labelKey: 'swahili' },
  { code: 'ml', labelKey: 'malayalam' },
  { code: 'ta', labelKey: 'tamil' },
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
