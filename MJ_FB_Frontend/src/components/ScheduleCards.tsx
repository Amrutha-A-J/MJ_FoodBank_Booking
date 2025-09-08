import { Card, CardContent, Typography, Grid, Box } from "@mui/material";
import type { ReactNode } from "react";
import i18n from "../i18n";

interface Cell {
  content: ReactNode;
  backgroundColor?: string;
  onClick?: () => void;
  colSpan?: number;
}

interface Row {
  time: string;
  cells: Cell[];
}

interface Props {
  maxSlots: number;
  rows: Row[];
}

export default function ScheduleCards({ maxSlots, rows }: Props) {
  const safeMaxSlots = Math.max(1, maxSlots);

  if (rows.length === 0) {
    return <Typography align="center">{i18n.t("no_bookings")}</Typography>;
  }

  return (
    <>
      {rows.map((row, idx) => {
        const used = row.cells.reduce((sum, c) => sum + (c.colSpan || 1), 0);
        return (
          <Card key={idx} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {row.time}
              </Typography>
              <Grid container spacing={1}>
                {row.cells.map((cell, i) => (
                  <Grid
                    item
                    key={i}
                    xs={(12 / safeMaxSlots) * (cell.colSpan || 1)}
                    onClick={cell.onClick}
                    sx={{
                      cursor: cell.onClick ? "pointer" : "default",
                    }}
                  >
                    <Box
                      sx={{
                        textAlign: "center",
                        p: 1,
                        backgroundColor: cell.backgroundColor,
                        ...(cell.backgroundColor && {
                          "&:hover": { backgroundColor: cell.backgroundColor },
                        }),
                      }}
                    >
                      {cell.content}
                    </Box>
                  </Grid>
                ))}
                {Array.from({ length: safeMaxSlots - used }).map((_, i) => (
                  <Grid item key={`empty-${i}`} xs={12 / safeMaxSlots} />
                ))}
              </Grid>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
