import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — ビルド成果物を file:// で直接開いても動作するように相対パスにする
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // 単一チャンクに固定: file:// 直接オープンや単一HTML化（Artifact配布）を壊さないため
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
