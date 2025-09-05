import React from 'react';
import { createRoot } from 'react-dom/client';
import SidePanelApp from './SidePanelApp';
import '../styles/globals.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<SidePanelApp />);
