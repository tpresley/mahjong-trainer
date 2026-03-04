import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  esbuild: {
    jsxInject: `import { jsx, Fragment } from 'sygnal/jsx'`,
    jsxFactory: 'jsx',
    jsxFragment: 'Fragment',
  },
})
