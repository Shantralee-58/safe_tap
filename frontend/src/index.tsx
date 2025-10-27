import React from 'react';
import ReactDOM from 'react-dom/client';
// 1. Correctly import the CSS file for styling (Tailwind directives are in here).
import './index.css'; 
import './App.jsx';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

