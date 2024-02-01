import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { Toaster } from 'sonner';

import './index.css';

import './defaults.css';

import '@fontsource/nunito';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <>
            <Toaster richColors />
            <img src="neiru.png" className="absolute left-0 top-0 w-full h-full opacity-15 select-none" />
            <div className="absolute left-0 top-0 w-full h-full flex flex-col items-center gap-4">
                <App />
            </div>
        </>
    </React.StrictMode>
);