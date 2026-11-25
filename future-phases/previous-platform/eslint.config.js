import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['**/dist/**','**/public/mockServiceWorker.js','packages/contracts/src/generated.ts','playwright-report/**','test-results/**']},{files:['**/*.mjs'],languageOptions:{globals:{console:'readonly'}}},js.configs.recommended,...ts.configs.recommended,{files:['**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-explicit-any':'error'}});
