import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: 'rgba(10,15,30,0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '14px',
                            borderRadius: '12px',
                        },
                        success: { iconTheme: { primary: '#00f5d4', secondary: '#0a0f1e' } },
                        error: { iconTheme: { primary: '#f43f5e', secondary: '#0a0f1e' } },
                    }}
                />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);