import { MenuItem, Select } from '@mui/material';

export default function LanguageSelector() {
  return (
    <Select
      value="en"
      onChange={() => {}}
      variant="standard"
      sx={{ width: 'auto', minWidth: 80, color: 'inherit', '&::before, &::after': { borderBottom: 'none' } }}
      disableUnderline
    >
      <MenuItem value="en">English</MenuItem>
    </Select>
  );
}
