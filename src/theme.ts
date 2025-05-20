import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#555555',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      color: '#000000',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: '#000000',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: '#000000',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: '#000000',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#000000',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: '#000000',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: '#000000',
        },
        head: {
          backgroundColor: '#f5f5f5',
          fontWeight: 'bold',
        },
      },
    },
  },
}); 