import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import type { ReactNode } from 'react';

export interface RoleTabOption {
  label: string;
  content: ReactNode;
}

interface RoleTabsProps {
  tabs: RoleTabOption[];
}

export default function RoleTabs({ tabs }: RoleTabsProps) {
  const [value, setValue] = useState(0);

  return (
    <Box>
      <Tabs
        value={value}
        onChange={(_, v) => setValue(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2, '@media print': { display: 'none' } }}
      >
        {tabs.map(t => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>
      <Box>{tabs[value]?.content}</Box>
    </Box>
  );
}

