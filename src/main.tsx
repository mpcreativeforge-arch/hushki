import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerSW } from './lib/push';
import './lib/install';
import { precacheStickers } from './lib/precache';
import { installGlobalHaptics, primeAudio } from './lib/feedback';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/manrope/wght.css';
import './styles.css';

registerSW();
precacheStickers();
primeAudio();
installGlobalHaptics();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
