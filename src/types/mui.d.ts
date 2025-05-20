import '@mui/material/styles';
import '@mui/material/Grid';

declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
    };
  }
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}

declare module '@mui/material/Grid' {
  interface GridTypeMap {
    props: {
      item?: boolean;
    }
  }
} 