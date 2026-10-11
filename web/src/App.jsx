import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import router from './router/index';
import './index.css';
import DesignProvider from './theme/DesignProvider';
import { tokens } from './theme/tokens';
import { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function App() {
  return (
    <DesignProvider>
    <AuthProvider>
      <Suspense fallback={<Box role="status" sx={{ minHeight: '60vh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 2 }}><CircularProgress size={32} /><Typography variant="body2">Loading page…</Typography></Box>}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: tokens.surfaceContainerHigh,
            color: tokens.onSurface,
            border: `1px solid ${tokens.outlineVariant}`,
            borderRadius: '16px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: tokens.success, secondary: tokens.surfaceContainerLowest } },
          error: { iconTheme: { primary: tokens.error, secondary: tokens.surfaceContainerLowest } },
        }}
      />
    </AuthProvider>
    </DesignProvider>
  );
}

