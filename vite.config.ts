// ================================================================
//  vite.config.ts
//  경로: vite.config.ts
//
//  역할: Vite 빌드 설정
//    - 개발 서버: http://localhost:3000
//    - publicDir: false → Games/Assets/ 경로는 /Games/Assets/... 로 직접 접근
//    - Phaser는 별도 청크로 분리해 초기 번들 최소화
//
//  에셋 경로 규칙:
//    CSS/HTML → 절대경로 /Games/Assets/... (Vite dev 서버 프로젝트 루트 기준)
//    Phaser   → 씬 preload() 내부 상대경로 유지 (런타임 fetch)
// ================================================================

import { defineConfig } from 'vite';
import { resolve }      from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',

  // public/ 폴더 비활성화 — 에셋은 Games/Assets/ 에서 직접 서빙
  publicDir: false,

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3000,
    // Vite dev 서버가 프로젝트 루트 전체를 서빙 → /Games/Assets/ 접근 가능
    fs: {
      allow: ['.'],
    },
  },

  build: {
    outDir:  'dist',
    target:  'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],   // Phaser를 별도 청크로 분리
        },
      },
    },
  },
});
