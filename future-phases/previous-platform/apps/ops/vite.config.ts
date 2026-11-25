import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';
export default defineConfig(({command,mode})=>{
 const env={...loadEnv(mode,process.cwd()),...process.env};
 if(command==='build' && (env.VITE_API_MODE!=='real' || !env.VITE_API_BASE_URL))throw new Error('Production build requires real mode and an explicit API base URL.');
 return {plugins:[react(),tailwind(),{name:'exclude-mock-worker',async closeBundle(){if(command==='build')await rm(resolve('dist/mockServiceWorker.js'),{force:true});}}],server:{fs:{allow:['../..']}},build:{sourcemap:false}};
});
