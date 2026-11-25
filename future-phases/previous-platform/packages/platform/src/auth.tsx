import {customerLifecycleService} from '../../api/src/customer-lifecycle';
import {accountHolderService} from '../../api/src/account-holder';
import {overviewService} from '../../api/src/overview';
import {controlsService} from '../../api/src/controls';
import {createContext,useContext,useEffect,useState,useMemo,useRef,useCallback,type ReactNode} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {Session,Surface,Environment} from '../../contracts/src';
import type {components} from '../../contracts/src/generated';
import {HttpClient,ApiError} from '../../api/src/http';
import {identityService} from '../../api/src/identity';
import {operationsService} from '../../api/src/operations';
import {exportService} from '../../api/src/exports';
interface Auth {
 startupError:Error|null;retrySession:()=>void;session:Session|null;loading:boolean;surface:Surface;generation:number;serverOffset:number;notice:string;
 lifecycle:ReturnType<typeof customerLifecycleService>;acceptRegistration:(session:Session)=>void;accountHolder:ReturnType<typeof accountHolderService>;overview:ReturnType<typeof overviewService>;controls:ReturnType<typeof controlsService>;operations:ReturnType<typeof operationsService>;service:ReturnType<typeof identityService>;exports:ReturnType<typeof exportService>;
 login:(input:components['schemas']['LoginRequest'])=>Promise<void>;logout:()=>Promise<void>;switchContext:(scope:string,environment:Environment)=>Promise<void>;extend:()=>Promise<void>;revalidate:()=>Promise<void>;
}
const Context=createContext<Auth|null>(null);
export function sessionDeadline(session:Session){const deadline=Math.min(Date.parse(session.expires_at),Date.parse(session.idle_expires_at));return Number.isFinite(deadline)?deadline:0;}
const permissions=(s:Session)=>JSON.stringify([s.principal_id,s.session_id,s.active_scope_id,s.environment,s.authorization_version,s.capabilities,s.scopes]);
export function AuthProvider({surface,baseUrl,children}:{surface:Surface;baseUrl:string;children:ReactNode}){
 const cache=useQueryClient(),[session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[startupError,setStartupError]=useState<Error|null>(null),[attempt,setAttempt]=useState(0),[generation,setGeneration]=useState(0),[serverOffset,setServerOffset]=useState(0),[notice,setNotice]=useState('');
 const current=useRef<Session|null>(null),epoch=useRef(0),clientRef=useRef<HttpClient|null>(null);
 const invalidate=useCallback(()=>{try{for(const key of Object.keys(sessionStorage)){if(key.startsWith('furaia.opening.'))sessionStorage.removeItem(key);}}catch{/* Storage unavailable; do not store identity data. */}epoch.current++;setGeneration(epoch.current);clientRef.current?.cancelPending();void cache.cancelQueries();cache.clear();},[cache]);
 const end=useCallback((message:string)=>{invalidate();current.current=null;clientRef.current?.setCsrf(undefined);setSession(null);setNotice(message);},[invalidate]);
 const services=useMemo(()=>{const client=new HttpClient(baseUrl,error=>{if(current.current)end(error.status===403?'Your access has been revoked. Sign in again.':'Your session has expired. Sign in again.');});clientRef.current=client;return {client,identity:identityService(client,surface),exports:exportService(client,surface),accountHolder:accountHolderService(client),lifecycle:customerLifecycleService(client),overview:overviewService(client),controls:controlsService(client),operations:operationsService(client)};},[surface,baseUrl,end]);
 const apply=useCallback((value:Session)=>{
  if(value.surface!==surface){end('This identity cannot access this application.');throw new Error('Wrong identity boundary.');}
  if(current.current && permissions(current.current)!==permissions(value))invalidate();
  current.current=value;services.client.setCsrf(value.csrf_token);setServerOffset(Date.parse(value.server_time)-Date.now());setSession(value);
 },[surface,services,end,invalidate]);
 useEffect(()=>{let active=true;const mine=epoch.current;setLoading(true);setStartupError(null);void services.identity.current().then(value=>{if(active&&mine===epoch.current)apply(value);}).catch((e:unknown)=>{if(active&&!(e instanceof DOMException&&e.name==='AbortError')){current.current=null;setSession(null);if(!(e instanceof ApiError&&e.status===401))setStartupError(e instanceof Error?e:new Error('Session service unavailable.'));}}).finally(()=>{if(active)setLoading(false);});return ()=>{active=false;};},[services,apply,attempt]);
 async function login(input:components['schemas']['LoginRequest']){invalidate();const mine=epoch.current;const value=await services.identity.login(input);if(mine!==epoch.current)throw new DOMException('Context changed','AbortError');setNotice('');apply(value);}
 async function logout(){await services.identity.logout();end('You have signed out.');}
 async function switchContext(scope:string,environment:Environment){invalidate();const mine=epoch.current;try{const value=await services.identity.switchContext(scope,environment);if(mine===epoch.current)apply(value);}catch(e){if(mine===epoch.current&&current.current)setSession({...current.current});throw e;}}
 async function extend(){const mine=epoch.current;const value=await services.identity.extend();if(mine===epoch.current)apply(value);}
 const revalidate=useCallback(async()=>{const mine=epoch.current;const value=await services.identity.current();if(mine===epoch.current)apply(value);},[services,apply]);
 useEffect(()=>{if(!session)return;const check=()=>{if(Date.now()+serverOffset>=sessionDeadline(session))end('Your session has expired. Sign in again.');};check();const timer=setInterval(check,1000);return ()=>clearInterval(timer);},[session,serverOffset,end]);
 useEffect(()=>{if(!session)return;const read=()=>{if(document.visibilityState==='visible')void revalidate().catch(()=>{});};const timer=setInterval(read,60_000);document.addEventListener('visibilitychange',read);return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',read);};},[session,revalidate]);
 return <Context.Provider value={{startupError,retrySession:()=>setAttempt(n=>n+1),session,loading,surface,generation,serverOffset,notice,service:services.identity,exports:services.exports,operations:services.operations,controls:services.controls,accountHolder:services.accountHolder,lifecycle:services.lifecycle,acceptRegistration:(value)=>{invalidate();setNotice('');apply(value);},overview:services.overview,login,logout,switchContext,extend,revalidate}}>{children}</Context.Provider>;
}
export function useAuth(){const auth=useContext(Context);if(!auth)throw new Error('Authentication context missing');return auth;}
