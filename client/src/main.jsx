import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { ToastProvider } from './toast.jsx';
import { RealtimeProvider } from './realtime.jsx';
import '@fontsource-variable/geist/wght.css'; // self-hosted variable grotesk (no third-party font requests)
import './styles.css';
import './layer.css';
import './theme.css';
import './editorial.css'; // last: the app's editorial layer (never applies on the landing route)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider><RealtimeProvider><App /></RealtimeProvider></ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
