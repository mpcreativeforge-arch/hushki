import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerSW } from './lib/push';
import { primeAudio } from './lib/feedback';
import './styles.css';

registerSW();
primeAudio();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
