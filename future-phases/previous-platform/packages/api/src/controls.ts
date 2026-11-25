import type {HttpClient} from './http';
import type {AuditEvent,AuditEventList,AuditVerification,AuditVerificationList,AuditVerificationRequest,StaffMember,StaffMemberList,RoleMatrix,IntegrationAdapter,IntegrationAdapterList,OpsAlert,OpsAlertList,AlertAcknowledgementRequest,OpsGovernance,OpsSettings,NotificationPreferences,NotificationPreferencesRequest} from '../../contracts/src';
export type ControlKind='audit'|'staff'|'integrations'|'alerts';
export type ControlLists={audit:AuditEventList;staff:StaffMemberList;integrations:IntegrationAdapterList;alerts:OpsAlertList};
export type ControlRows={audit:AuditEvent;staff:StaffMember;integrations:IntegrationAdapter;alerts:OpsAlert};
const route=(kind:ControlKind)=>kind==='audit'?'audit-events':kind;
export function controlsService(client:HttpClient){return {
 list:<K extends ControlKind>(kind:K,filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const params=new URLSearchParams({...filters,limit:'25'});if(cursor)params.set('cursor',cursor);return client.request<ControlLists[K]>(`/ops/v1/${route(kind)}?${params}`,{signal});},
 detail:<K extends ControlKind>(kind:K,id:string,signal:AbortSignal)=>client.request<ControlRows[K]>(`/ops/v1/${route(kind)}/${encodeURIComponent(id)}`,{signal}),
 roleMatrix:(signal:AbortSignal)=>client.request<RoleMatrix>('/ops/v1/role-matrix',{signal}),
 governance:(signal:AbortSignal)=>client.request<OpsGovernance>('/ops/v1/governance',{signal}),
 settings:(signal:AbortSignal)=>client.request<OpsSettings>('/ops/v1/settings',{signal}),
 updatePreferences:(body:NotificationPreferencesRequest,signal:AbortSignal)=>client.request<NotificationPreferences>('/ops/v1/me/preferences',{method:'PATCH',body:JSON.stringify(body),signal}),
 acknowledge:(id:string,body:AlertAcknowledgementRequest,key:string,signal:AbortSignal)=>client.request<OpsAlert>(`/ops/v1/alerts/${encodeURIComponent(id)}/acknowledgements`,{method:'POST',body:JSON.stringify(body),headers:{'Idempotency-Key':key},signal}),
 verifications:(signal:AbortSignal)=>client.request<AuditVerificationList>('/ops/v1/audit-verifications',{signal}),
 verification:(id:string,signal:AbortSignal)=>client.request<AuditVerification>(`/ops/v1/audit-verifications/${encodeURIComponent(id)}`,{signal}),
 verify:(body:AuditVerificationRequest,key:string,signal:AbortSignal)=>client.request<AuditVerification>('/ops/v1/audit-verifications',{method:'POST',body:JSON.stringify(body),headers:{'Idempotency-Key':key},signal}),
};}
