import { CssBaseline, GlobalStyles } from '@mui/material';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { tokens } from './tokens';

const variables = Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--md-${name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, value]));

export default function DesignProvider({ children }) {
  return (
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={{ ':root': variables }} />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
