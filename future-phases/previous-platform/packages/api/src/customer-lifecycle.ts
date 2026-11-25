import type {HttpClient} from './http';
import type {RecoveryRequest,RecoveryCase,RecoveryCurrent,RecoveryCompleteRequest,Session,CustomerProfile,ClosureEligibility,ClosureRequest,ClosureCase,ClosureCaseList,StepUpGrant} from '../../contracts/src';
export function customerLifecycleService(client:HttpClient){return {
 profile:(signal:AbortSignal)=>client.request<CustomerProfile>('/v1/me',{signal}),
 recover:(body:RecoveryRequest,signal:AbortSignal)=>client.request<RecoveryCase>('/v1/recovery-requests',{method:'POST',body:JSON.stringify(body),signal}),
 currentRecovery:(signal:AbortSignal)=>client.request<RecoveryCurrent>('/v1/recovery-requests/current',{signal}),
 recovery:(id:string,signal:AbortSignal)=>client.request<RecoveryCase>(`/v1/recovery-requests/${encodeURIComponent(id)}`,{signal}),
 resendRecovery:(id:string,signal:AbortSignal)=>client.request<RecoveryCase>(`/v1/recovery-requests/${encodeURIComponent(id)}/challenges`,{method:'POST',signal}),
 verifyRecovery:(id:string,code:string,signal:AbortSignal)=>client.request<RecoveryCase>(`/v1/recovery-requests/${encodeURIComponent(id)}/verifications`,{method:'POST',body:JSON.stringify({code}),signal}),
 completeRecovery:(id:string,body:RecoveryCompleteRequest,key:string,signal:AbortSignal)=>client.request<Session>(`/v1/recovery-requests/${encodeURIComponent(id)}/completions`,{method:'POST',body:JSON.stringify(body),headers:{'Idempotency-Key':key},signal}),
 closureEligibility:(id:string,signal:AbortSignal)=>client.request<ClosureEligibility>(`/v1/accounts/${encodeURIComponent(id)}/closure-eligibility`,{signal}),
 closures:(id:string,signal:AbortSignal)=>client.request<ClosureCaseList>(`/v1/accounts/${encodeURIComponent(id)}/closure-requests`,{signal}),
 requestClosure:(id:string,body:ClosureRequest,key:string,grant:StepUpGrant,signal:AbortSignal)=>client.request<ClosureCase>(`/v1/accounts/${encodeURIComponent(id)}/closure-requests`,{method:'POST',body:JSON.stringify(body),headers:{'Idempotency-Key':key,'X-Step-Up-Id':grant.id},signal}),
 closure:(id:string,signal:AbortSignal)=>client.request<ClosureCase>(`/v1/closure-requests/${encodeURIComponent(id)}`,{signal}),
};}
