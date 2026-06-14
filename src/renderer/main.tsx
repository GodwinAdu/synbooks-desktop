import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';
import { SyncProvider } from './contexts/sync-context';
import { LicenseProvider } from './contexts/license-context';
import { Toaster } from './components/ui/sonner';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LicenseProvider>
            <SyncProvider>
              <App />
              <Toaster richColors />
            </SyncProvider>
          </LicenseProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
