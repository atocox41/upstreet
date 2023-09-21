import React from 'react';
import ReactDOM from 'react-dom/client';

import {WorldApp} from './World.jsx';
import '../styles/globals.css';

//

const match = window.location.pathname.match(/^\/w(?:orld)?\/(.+)$/);
const world = decodeURIComponent(match?.[1] ?? '');
const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get('debug') !== null;

//

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <WorldApp
    world={world}
    debug={debug}
  />
);