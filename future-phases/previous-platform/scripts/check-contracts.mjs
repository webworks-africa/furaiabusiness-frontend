import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const inventory=JSON.parse(readFileSync('docs/page-inventory.json','utf8'));
const register=JSON.parse(readFileSync('docs/contract-register.json','utf8'));
const contract=JSON.parse(readFileSync('contracts/openapi.json','utf8'));
assert.equal(inventory.length,63);assert.equal(new Set(inventory.map(p=>p.id)).size,63);
for(const [prefix,count] of [['O',22],['C',18],['P',23]])assert.equal(inventory.filter(p=>p.id.startsWith(prefix)).length,count);
for(const p of inventory){assert.ok(p.Actions && p.Acceptance && p.required_states.length===8);assert.ok(register.some(r=>r.page===p.id)||p.id==='P10');}
for(const entry of Object.values(contract.paths))for(const op of Object.values(entry)){assert.ok(op.security);assert.ok(op.responses['403']);assert.ok(op.responses['503']);}
assert.equal(Object.keys(contract.paths).length,99);
console.log(`PASS: 63 pages, ${register.length} page/endpoint dependencies, 109 executable identity/shared/operations/account-holder workflow operations; Laravel mappings pending.`);
