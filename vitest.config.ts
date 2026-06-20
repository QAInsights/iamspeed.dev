import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
          },
        },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/unit/setup.ts'],
        },
      },
      {
        resolve: {
          alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
          },
        },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.tsx'],
          environment: 'happy-dom',
          setupFiles: ['tests/integration/setup.ts'],
        },
      },
    ],
  },
});
