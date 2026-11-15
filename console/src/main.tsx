import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './a2ui/a2ui.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
