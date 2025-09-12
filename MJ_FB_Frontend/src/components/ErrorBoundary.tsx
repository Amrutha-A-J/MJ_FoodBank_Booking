import { Box, Button, Typography } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={2} textAlign="center">
          <Typography variant="h6" gutterBottom>
            Something went wrong. Try reloading the page.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            size="medium"
          >
            Reload
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
