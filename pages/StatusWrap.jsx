import React from 'react';
import ReactDOM from 'react-dom/client';

import {StatusApp} from './Status.jsx';
import '../styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <StatusApp />
  </React.StrictMode>,
);