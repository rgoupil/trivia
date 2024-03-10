import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      port: Number(env.VITE_PORT) ?? 3000,
    },
    build: {
      outDir: 'dist',
    },
    plugins: [react()],
  };
})
