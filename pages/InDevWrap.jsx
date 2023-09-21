import React from 'react';
import ReactDOM from 'react-dom/client';

import {AdventureApp} from './Adventure.jsx';
import '../styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AdventureApp
    beta
  />
);