import { defineConfig } from 'vite';


// https://vitejs.dev/config/

export default defineConfig({
  esbuild: {
    jsxFactory: `jsx`,
    jsxFragment: 'Fragment',
    jsxInject: `import { jsx, Fragment } from 'sygnal/jsx'`
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
