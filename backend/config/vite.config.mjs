import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

// SPA entry point
function getHtmlEntries() {
    return {
        main: resolve(root, 'index.html')
    }
}

// https://vite.dev/config/
export default defineConfig({
    root: root,
    publicDir: resolve(root, 'backend/public'),
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'copy-style-css',
            writeBundle() {
                try {
                    copyFileSync(
                        resolve(root, 'backend/public/style.css'),
                        resolve(root, 'dist/style.css')
                    )
                } catch { /* ignore if missing */ }
            }
        }
    ],
    build: {
        outDir: resolve(root, 'dist'),
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
            input: getHtmlEntries(),
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
            onwarn(warning, warn) {
                if (warning.code === 'CIRCULAR_DEPENDENCY') return
                warn(warning)
            }
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    },
    preview: {
        port: 4173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    }
})
