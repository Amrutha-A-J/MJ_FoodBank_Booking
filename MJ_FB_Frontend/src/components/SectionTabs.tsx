import { Box, Tabs, Tab } from '@mui/material';
import { useState, type ReactNode, type ReactElement } from 'react';

interface TabItem {
  label: string;
  icon?: ReactElement;
  content: ReactNode;
}

interface SectionTabsProps {
  tabs: TabItem[];
  ariaLabel: string;
}

export default function SectionTabs({ tabs, ariaLabel }: SectionTabsProps) {
  const [value, setValue] = useState(0);

  const baseId = ariaLabel.replace(/\s+/g, '-');

  return (
    <Box>
      <Tabs
        value={value}
        onChange={(_, v) => setValue(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={ariaLabel}
      >
        {tabs.map((tab, i) => (
          <Tab
            key={tab.label}
            label={tab.label}
            icon={tab.icon}
            iconPosition={tab.icon ? 'start' : undefined}
            id={`${baseId}-tab-${i}`}
            aria-controls={`${baseId}-tabpanel-${i}`}
          />
        ))}
      </Tabs>
      {tabs.map((tab, i) => (
        <div
          key={tab.label}
          role="tabpanel"
          hidden={value !== i}
          id={`${baseId}-tabpanel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
        >
          {value === i && <Box sx={{ pt: 2 }}>{tab.content}</Box>}
        </div>
      ))}
    </Box>
  );
}
