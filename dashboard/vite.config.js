import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './src/jsx-dev-runtime-shim.js'),
    },
  },
})
