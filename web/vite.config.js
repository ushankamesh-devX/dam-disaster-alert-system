import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // "@/components/ui/button" → src/components/ui/button (shadcn/ui convention)
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
