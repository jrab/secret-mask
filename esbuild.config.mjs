import { context } from 'esbuild';

const builder = await context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'main.js',
  logLevel: 'info',
});
if (process.argv.includes('--watch')) await builder.watch();
else {
  await builder.rebuild();
  await builder.dispose();
}
