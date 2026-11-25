import type {Session,ShellContext,Surface,Environment,SessionList,SessionFilters,StepUpRequest,StepUpChallenge,StepUpGrant} from '../../contracts/src';
import {prefixes} from '../../contracts/src';
import type {components} from '../../contracts/src/generated';
import {HttpClient} from './http';
export function identityService(client:HttpClient,surface:Surface){
 const prefix=prefixes[surface];
 async function accept(session:Session){client.setCsrf(session.csrf_token);return session;}
 return {
  current:(signal?:AbortSignal)=>client.request<Session>(`${prefix}/sessions`,signal?{signal}:{}),
  login:async(input:components['schemas']['LoginRequest'])=>accept(await client.request<Session>(`${prefix}/sessions`,{method:'POST',body:JSON.stringify(input)})),
  logout:()=>client.request<void>(`${prefix}/sessions`,{method:'DELETE'}),
  context:(signal?:AbortSignal)=>client.request<ShellContext>(`${prefix}/shell-context`,signal?{signal}:{}),
  switchContext:async(scope_id:string,environment:Environment)=>accept(await client.request<Session>(`${prefix}/session/context`,{method:'POST',body:JSON.stringify({scope_id,environment})})),
  extend:async()=>accept(await client.request<Session>(`${prefix}/session/extensions`,{method:'POST'})),
  sessions:(filters:SessionFilters,cursor:string|null,signal?:AbortSignal)=>{const params=new URLSearchParams({...filters,limit:'25'});if(cursor)params.set('cursor',cursor);return client.request<SessionList>(`${prefix}/me/sessions?${params}`,signal?{signal}:{});},
  startStepUp:(input:StepUpRequest)=>client.request<StepUpChallenge>(`${prefix}/step-up/challenges`,{method:'POST',body:JSON.stringify(input)}),
  verifyStepUp:(id:string,code:string)=>client.request<StepUpGrant>(`${prefix}/step-up/challenges/${encodeURIComponent(id)}/verifications`,{method:'POST',body:JSON.stringify({code})}),
  revokeSession:(id:string,expected_version:number,grant:StepUpGrant)=>client.request<void>(`${prefix}/me/sessions/${encodeURIComponent(id)}`,{method:'DELETE',headers:{'X-Step-Up-Id':grant.id},body:JSON.stringify({expected_version})}),
 };
}
