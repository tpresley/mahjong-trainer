import { defineConfig } from 'vite'
import sygnal from 'sygnal/vite'

export default defineConfig({
  plugins: [sygnal()],
  base: '',
  server: {
    host: '127.0.0.1',
  },
})