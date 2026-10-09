// Builds public/assets/share.js = qrcode-generator (MIT, Kazuhiko Arase) + scripts/share-src.js, minified.
//   node scripts/build-share.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const qr = readFileSync(root + 'scripts/vendor-qrcode.js', 'utf8');
const src = readFileSync(root + 'scripts/share-src.js', 'utf8');
const r = await build({ stdin: { contents: qr.replace(/\(function \(factory\)[\s\S]*$/, '') + '\n' + src, loader: 'js' }, bundle: false, minify: true, write: false, target: 'es2018' });
const header = '/*! qrcode-generator (c) 2009 Kazuhiko Arase, MIT license. Share card (c) Tap Am. */\n';
writeFileSync(root + 'public/assets/share.js', header + r.outputFiles[0].text);
console.log('share.js', (header.length + r.outputFiles[0].text.length) / 1000, 'kB');
