import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const sampleDocument =
  'https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: 'dist',
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
    },
  }),
  webExt: {
    binaries: {
      chrome: 'brave-browser',
    },
    chromiumProfile: '.brave-dev-profile',
    keepProfileChanges: true,
    startUrls: [sampleDocument],
    chromiumArgs: ['--no-first-run', '--no-default-browser-check'],
  },
  manifest: {
    name: 'Nodo',
    description:
      'Google ドキュメントのタブをページのように扱い、本文に集中できる編集画面を足します。',
    permissions: ['storage', 'activeTab'],
    commands: {
      'toggle-nodo': {
        description: 'Nodoの表示を切り替える',
        suggested_key: {
          default: 'Ctrl+Shift+Period',
        },
      },
    },
    action: {
      default_title: 'Nodo',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
