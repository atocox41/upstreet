import React from 'react';
import ReactDOM from 'react-dom/client';

import {AdventureApp} from './Adventure.jsx';
import './helpers/analytics.js';
import '../styles/globals.css';

//

// parse difficulty and range from the query string
const urlParams = new URLSearchParams(window.location.search);
let difficulty = urlParams.get('difficulty');
let range = urlParams.get('range');
range = range ? parseInt(range, 10) : undefined;

//

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AdventureApp
    multiplayer
    difficulty={difficulty}
    range={range}
  />
);