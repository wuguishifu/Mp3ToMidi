import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import './defaults.css';

import '@fontsource/nunito';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <>
            <img src="neiru.png" className="absolute left-0 top-0 w-full h-full opacity-15" />
            <div className="absolute left-0 top-0 w-full h-full flex flex-col items-center">
                <App />
            </div>
        </>
    </React.StrictMode>
);