import React from 'react';
import ReactDOM from 'react-dom/client';

import {AuthApp} from './auth.jsx';
import '../styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthApp />
  </React.StrictMode>,
);