import { createTheme } from '@mui/material/styles';
import { tokens as t } from './tokens';

const theme = createTheme({
  palette: {
    primary: { main: t.primary, contrastText: t.onPrimary },
    secondary: { main: t.secondary },
    error: { main: t.error }, success: { main: t.success }, warning: { main: t.warning },
    info: { main: t.secondary }, background: { default: t.surface, paper: t.surfaceContainerLowest },
    text: { primary: t.onSurface, secondary: t.onSurfaceVariant }, divider: t.outlineVariant,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Segoe UI", Roboto, system-ui, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.25 },
    h2: { fontSize: '1.5rem', fontWeight: 600 }, h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.125rem', fontWeight: 600 }, body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' }, button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: t.surface }, ':focus-visible': { outline: `2px solid ${t.primary}`, outlineOffset: 3 } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 24, minHeight: 40, paddingInline: 20, gap: 8 },
        outlined: { borderColor: t.outline }, text: { paddingInline: 12 } },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: '50%', width: 40, height: 40 } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: t.outlineVariant } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 }, notchedOutline: { borderColor: t.outline } } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.875rem' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 }, sizeSmall: { height: 28 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 28, backgroundColor: t.surfaceContainerLowest, margin: 16, maxHeight: 'calc(100% - 32px)' } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: t.surfaceContainerLow } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: t.surfaceContainerHighest }, head: { color: t.onSurfaceVariant, backgroundColor: t.surfaceContainerLow, fontWeight: 600, fontSize: '0.75rem' } } },
    MuiTableRow: { styleOverrides: { root: { '&:last-child td': { borderBottom: 0 } } } },
    MuiSkeleton: { defaultProps: { animation: 'wave', variant: 'rounded' } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
export default theme;
