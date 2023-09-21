import React from 'react';
import ReactDOM from 'react-dom/client';

import {HomeApp} from './Home.jsx';
import './helpers/analytics.js';
import '../styles/globals.css';

//

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <HomeApp />
);