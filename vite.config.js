import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // resolve: {
  //   // Explicitly dedupe React to ensure compatibility with plugin-react v5
  //   // which no longer handles this automatically.
  //   dedupe: ['react', 'react-dom'],
  // },
});
