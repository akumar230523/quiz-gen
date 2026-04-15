/**
 * main.jsx  ─  Application entry point
 *
 * Provider order (inner to outer):
 *   ThemeProvider  →  manages dark/light CSS class on <html>
 *   AuthProvider   →  manages JWT and user session
 *   App            →  router + all pages
 *   Toaster        →  global toast notifications (react-hot-toast)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <App />

                    {/* Global toast notification system */}
                    <Toaster
                        position="top-right"
                        gutter={8}
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: 'var(--surface)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                fontFamily: 'DM Sans, sans-serif',
                                fontSize: '14px',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                            },
                            success: { iconTheme: { primary: '#00f5d4', secondary: '#0a0f1e' } },
                            error: { iconTheme: { primary: '#f43f5e', secondary: '#0a0f1e' } },
                        }}
                    />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>,
);
