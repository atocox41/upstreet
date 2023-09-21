import React from 'react';
import ReactDOM from 'react-dom/client';

import {JediCouncilApp} from './JediCouncil.jsx';
import './helpers/analytics.js';
import '../styles/globals.css';

//

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <JediCouncilApp />
);