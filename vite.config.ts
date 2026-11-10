import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH: "/hushki/" pro GitHub Pages, "/" pro vlastní doménu.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
