import { useState, type ReactNode } from 'react';
import type { ReactElement } from 'react';
import { Paper, Tabs, Tab, Box, type SxProps, type Theme } from '@mui/material';

export interface TabItem {
  label: ReactNode;
  icon?: ReactElement;
  content: ReactNode;
}

interface StyledTabsProps {
  tabs: TabItem[];
  value?: number;
  onChange?: (event: React.SyntheticEvent, newValue: number) => void;
  sx?: SxProps<Theme>;
}

export default function StyledTabs({ tabs, value: valueProp, onChange, sx }: StyledTabsProps) {
  const [internal, setInternal] = useState(0);
  const value = valueProp ?? internal;

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    onChange?.(event, newValue);
    if (valueProp === undefined) setInternal(newValue);
  };

  return (
    <Paper sx={{ p: 2, ...(sx as object) }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="styled tabs"
      >
        {tabs.map((t, i) => (
          <Tab
            key={i}
            label={t.label}
            icon={t.icon}
            iconPosition={t.icon ? 'start' : undefined}
            id={`tab-${i}`}
            aria-controls={`tabpanel-${i}`}
          />
        ))}
      </Tabs>
      {tabs.map((t, i) => (
        <div
          key={i}
          role="tabpanel"
          hidden={value !== i}
          id={`tabpanel-${i}`}
          aria-labelledby={`tab-${i}`}
        >
          <Box sx={{ pt: 2, display: value === i ? 'block' : 'none' }}>{t.content}</Box>
        </div>
      ))}
    </Paper>
  );
}

