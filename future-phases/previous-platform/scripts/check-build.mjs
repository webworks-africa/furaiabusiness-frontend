import {readdirSync,readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
for(const app of ['ops','customer','partner']){
 const out=`apps/${app}/dist`;
 assert.ok(existsSync(`${out}/index.html`));
 assert.ok(!existsSync(`${out}/mockServiceWorker.js`));
 for(const file of readdirSync(`${out}/assets`).filter(f=>f.endsWith('.js'))){
  const code=readFileSync(`${out}/assets/${file}`,'utf8');
  assert.ok(!/mock-csrf-|operator@staff\.sandbox|customer@customer\.sandbox|developer@partner\.sandbox|setupWorker|Mock Service Worker/.test(code),`Mock code found in ${app}`);
 }
}
console.log('PASS: all three real-mode builds exclude MSW worker, fixtures and mock setup.');
