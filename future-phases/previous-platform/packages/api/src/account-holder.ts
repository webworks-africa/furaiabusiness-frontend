import type {HttpClient} from './http';
import type {RegistrationPolicy,RegistrationRequest,Registration,RegistrationCurrent,Session,CustomerVerification,VerificationDraftRequest,CustomerEvidence,VerificationSubmissionRequest,EligibleProducts,AccountOpeningRequest,CustomerAccount,CustomerAccountList,CustomerOverview} from '../../contracts/src';
export function accountHolderService(client:HttpClient){return {
 registrationPolicy:(signal:AbortSignal)=>client.request<RegistrationPolicy>('/v1/registration-policy',{signal}),
 currentRegistration:(signal:AbortSignal)=>client.request<RegistrationCurrent>('/v1/registrations/current',{signal}),
 register:(body:RegistrationRequest,signal:AbortSignal)=>client.request<Registration>('/v1/registrations',{method:'POST',body:JSON.stringify(body),signal}),
 verifyContact:(id:string,code:string,signal:AbortSignal)=>client.request<Session>(`/v1/registrations/${encodeURIComponent(id)}/verify`,{method:'POST',body:JSON.stringify({code}),signal}),
 resend:(id:string,signal:AbortSignal)=>client.request<Registration>(`/v1/registrations/${encodeURIComponent(id)}/challenges`,{method:'POST',signal}),
 verification:(signal:AbortSignal)=>client.request<CustomerVerification>('/v1/me/verification',{signal}),
 saveDraft:(body:VerificationDraftRequest,signal:AbortSignal)=>client.request<CustomerVerification>('/v1/me/verification',{method:'PATCH',body:JSON.stringify(body),signal}),
 upload:(file:File,signal:AbortSignal)=>{const body=new FormData();body.set('file',file);return client.request<CustomerEvidence>('/v1/me/verification/evidence',{method:'POST',body,signal});},
 submit:(body:VerificationSubmissionRequest,key:string,signal:AbortSignal)=>client.request<CustomerVerification>('/v1/me/verification/submissions',{method:'POST',body:JSON.stringify(body),headers:{'Idempotency-Key':key},signal}),
 eligible:(signal:AbortSignal)=>client.request<EligibleProducts>('/v1/products/eligible',{signal}),
 open:(body:AccountOpeningRequest,key:string,signal:AbortSignal)=>client.request<CustomerAccount>('/v1/accounts',{method:'POST',body:JSON.stringify(body),headers:{'Idempotency-Key':key},signal}),
 accounts:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25'});if(cursor)p.set('cursor',cursor);return client.request<CustomerAccountList>(`/v1/accounts?${p}`,{signal});},
 account:(id:string,signal:AbortSignal)=>client.request<CustomerAccount>(`/v1/accounts/${encodeURIComponent(id)}`,{signal}),
 overview:(signal:AbortSignal)=>client.request<CustomerOverview>('/v1/me/overview',{signal}),
};}
