import {describe,it,expect} from 'vitest';
import {http,HttpResponse} from 'msw';
import {HttpClient,ApiError} from '../packages/api/src/http';
import {identityService} from '../packages/api/src/identity';
import {prefixes,type Surface} from '../packages/contracts/src';
import {mockIdentifiers} from '../packages/mocks/src/fixtures';
import {server} from './setup';
const base='http://localhost';
function make(surface:Surface){const client=new HttpClient(base);return {client,service:identityService(client,surface)};}
describe('Surface identity and scope contracts',()=>{
 for(const surface of ['ops','customer','partner'] as const){
  it(`${surface}: signs in, restores session, changes only authorized scope and signs out`,async()=>{const {service}=make(surface);const s=await service.login({identifier:mockIdentifiers[surface],challenge:'246810'});expect(s.surface).toBe(surface);expect((await service.current()).principal_id).toBe(s.principal_id);const scope=s.scopes[1];if(!scope)throw Error('fixture');const next=await service.switchContext(scope.id,'sandbox');expect(next.active_scope_id).toBe(scope.id);expect((await service.context()).scope_id).toBe(scope.id);await expect(service.switchContext(scope.id,'production')).rejects.toMatchObject({status:403});await expect(service.switchContext('00000000-0000-4000-8000-999999999999','sandbox')).rejects.toMatchObject({status:403});await service.logout();await expect(service.current()).rejects.toMatchObject({status:401});});
  it(`${surface}: rejects all other-domain fixture identifiers`,async()=>{const {service}=make(surface);for(const other of ['ops','customer','partner'] as const)if(other!==surface)await expect(service.login({identifier:mockIdentifiers[other],challenge:'246810'})).rejects.toMatchObject({status:401});});
 }
 it('rejects a write without CSRF and a substituted identity boundary',async()=>{const {service}=make('ops');await service.login({identifier:mockIdentifiers.ops,challenge:'246810'});await expect(new HttpClient(base).request('/ops/v1/sessions',{method:'DELETE'})).rejects.toMatchObject({status:403});await expect(new HttpClient(base).request('/ops/v1/shell-context',{headers:{'X-Mock-Identity-Boundary':'partner'}})).rejects.toMatchObject({status:403});expect((await service.current()).surface).toBe('ops');});
 it('clears authorization on expired session and does not substitute fixture data',async()=>{let lost=0;const client=new HttpClient(base,()=>lost++);server.use(http.get(`${base}/ops/v1/shell-context`,()=>HttpResponse.json({error:{code:'UNAUTHENTICATED',message:'Session expired',details:{}},request_id:'test'},{status:401})));await expect(client.request('/ops/v1/shell-context')).rejects.toBeInstanceOf(ApiError);expect(lost).toBe(1);});
 for(const status of [409,422,429,503])it(`surfaces ${status} with request evidence and Retry-After`,async()=>{server.use(http.get(`${base}/ops/v1/shell-context`,()=>HttpResponse.json({error:{code:'TEST_ERROR',message:'Controlled failure',details:{}},request_id:'request-test'},{status,headers:{'Retry-After':'5'}})));await expect(new HttpClient(base).request('/ops/v1/shell-context')).rejects.toMatchObject({status,retryAfter:'5',body:{request_id:'request-test'}});});
 it('identity namespace paths are distinct',()=>expect(new Set(Object.values(prefixes)).size).toBe(3));
});
