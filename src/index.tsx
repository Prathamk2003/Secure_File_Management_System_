import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { RefreshProvider } from './context/RefreshContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <RefreshProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RefreshProvider>
  </React.StrictMode>
); 