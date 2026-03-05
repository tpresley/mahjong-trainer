import { defineConfig } from 'vite';


// https://vitejs.dev/config/

export default defineConfig({
  base: '',
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'sygnal',
  },
  server: {
    host: '127.0.0.1',
  },
  build: {
    minify: 'terser',
    terserOptions: {
      mangle: {
        reserved: ['Fragment'],
      },
    }
  }
});
