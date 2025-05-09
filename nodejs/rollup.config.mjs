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

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      aliases,
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      json(),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
    external: ['ethers', 'viem', '@biconomy/abstractjs'],
  },
  {
    input: 'dist/esm/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [aliases, dts()],
  },
];