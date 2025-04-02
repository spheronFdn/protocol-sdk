import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import alias from '@rollup/plugin-alias';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(
  await fs.readFile(new URL('./package.json', import.meta.url), 'utf8')
);

const aliases = alias({
  entries: [
    { find: '@modules', replacement: path.resolve(__dirname, 'src/modules') },
    { find: '@contracts', replacement: path.resolve(__dirname, 'src/contracts') },
    { find: '@config', replacement: path.resolve(__dirname, 'src/config') },
    { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') },
  ]
});

const biconomyResolverPlugin = {
  name: 'biconomy-resolver',
  async resolveId(source) {
    if (source === '@biconomy/abstractjs') {
      // For ESM projects
      const modulePath = new URL('@biconomy/abstractjs/dist/_esm/index.js', import.meta.url).pathname;
      return { id: modulePath, external: true };
    }
    return null;
  }
};

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        preserveModules: false,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        preserveModules: false,
      },
    ],
    plugins: [
      biconomyResolverPlugin,
      aliases,
      resolve({
        preferBuiltins: true,
        exportConditions: ['import', 'default'],
        mainFields: ['module', 'main'],
      }),
      commonjs(),
      json(),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
    external: [
      /^ethers(\/.*)?$/,
      /^@biconomy\/abstractjs(\/.*)?$/,
      /^viem(\/.*)?$/,
    ],
  },
  {
    input: 'dist/esm/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [aliases, dts()],
  },
];