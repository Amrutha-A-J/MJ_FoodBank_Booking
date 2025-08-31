import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';

export interface RoleTabItem {
  label: string;
  content: React.ReactNode;
}

interface RoleTabsProps {
  tabs: RoleTabItem[];
}

export default function RoleTabs({ tabs }: RoleTabsProps) {
  const [value, setValue] = useState(0);

  return (
    <>
      <Tabs
        value={value}
        onChange={(_, v) => setValue(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        {tabs.map(t => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>
      {tabs.map((t, i) => (
        <Box key={t.label} hidden={value !== i}>
          {value === i && t.content}
        </Box>
      ))}
    </>
  );
}

