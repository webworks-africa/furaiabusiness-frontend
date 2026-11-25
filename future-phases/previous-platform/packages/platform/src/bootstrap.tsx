import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import type {Surface} from '../../contracts/src';
import {AuthProvider} from './auth';
import {App} from './app';
export async function bootstrap(surface:Surface){
 const mockMode=import.meta.env.DEV && import.meta.env.VITE_API_MODE==='mock';
 if(import.meta.env.PROD && import.meta.env.VITE_API_MODE==='mock')throw new Error('Mock mode is forbidden in production.');
 if(import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL)throw new Error('Production requires an explicit reviewed API base URL.');
 if(mockMode){const {worker}=await import('../../mocks/src/browser');await worker.start({onUnhandledFrame({frame,defaults}){if(frame.protocol==='http' && frame.data instanceof Request && new URL(frame.data.url).pathname.includes('/v1/'))defaults.error();},serviceWorker:{url:'/mockServiceWorker.js'}});}
 else if(import.meta.env.PROD && 'serviceWorker' in navigator){
  // Remove an earlier development MSW registration on the same origin.
  for(const registration of await navigator.serviceWorker.getRegistrations())if(registration.active?.scriptURL.endsWith('/mockServiceWorker.js'))await registration.unregister();
 }
 const root=document.getElementById('root');if(!root)throw new Error('Missing application root');
 const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
 createRoot(root).render(<QueryClientProvider client={queryClient}><AuthProvider surface={surface} baseUrl={import.meta.env.VITE_API_BASE_URL??''}><App mockMode={mockMode}/></AuthProvider></QueryClientProvider>);
}
