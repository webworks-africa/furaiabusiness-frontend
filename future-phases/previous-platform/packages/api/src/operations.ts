import type {HttpClient} from './http';
import type {OpsAccount,OpsAccountList,OpsOperation,OpsOperationList,OpsHold,OpsHoldList,OpsJournal,OpsJournalList,OpsCollection,OpsCollectionList,OpsPayout,OpsPayoutList,ProviderEvent,OpsCustomer,OpsCustomerList,OpsOnboarding,OpsOnboardingList,KycDocument,ReconciliationRun,ReconciliationRunList,OpsReportList,DailyClose,FinancialExportRequest,ExportJob,StepUpGrant} from '../../contracts/src';
export type OpsFilters=Readonly<{q:string;state:string;currency:string;kind:string;provider:string;account:string;owner:string;product:string;from:string;to:string}>;
export function operationsService(client:HttpClient){
 function params(filters:OpsFilters,cursor:string|null){const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return p;}
 return {
 reconciliation:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25'});if(cursor)p.set('cursor',cursor);return client.request<ReconciliationRunList>(`/ops/v1/reconciliation/runs?${p}`,{signal});},
 reconciliationRun:(id:string,signal:AbortSignal)=>client.request<ReconciliationRun>(`/ops/v1/reconciliation/runs/${encodeURIComponent(id)}`,{signal}),
 reports:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25'});if(cursor)p.set('cursor',cursor);return client.request<OpsReportList>(`/ops/v1/reports?${p}`,{signal});},
 dailyClose:(date:string,signal:AbortSignal)=>client.request<DailyClose>(`/ops/v1/daily-close?date=${encodeURIComponent(date)}`,{signal}),
 financialExport:(payload:FinancialExportRequest,key:string,grant:StepUpGrant,signal?:AbortSignal)=>client.request<ExportJob>('/ops/v1/exports',{method:'POST',body:JSON.stringify(payload),headers:{'Idempotency-Key':key,'X-Step-Up-Id':grant.id},...(signal?{signal}:{})}),
 financialExportStatus:(id:string,signal:AbortSignal)=>client.request<ExportJob>(`/ops/v1/exports/${encodeURIComponent(id)}`,{signal}),
 financialExportDownload:(id:string,signal?:AbortSignal)=>client.download(`/ops/v1/exports/${encodeURIComponent(id)}/download`,signal),
 customers:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return client.request<OpsCustomerList>(`/ops/v1/customers?${p}`,{signal});},
 customer:(id:string,signal:AbortSignal)=>client.request<OpsCustomer>(`/ops/v1/customers/${encodeURIComponent(id)}`,{signal}),
 onboarding:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return client.request<OpsOnboardingList>(`/ops/v1/onboarding?${p}`,{signal});},
 application:(id:string,signal:AbortSignal)=>client.request<OpsOnboarding>(`/ops/v1/onboarding/${encodeURIComponent(id)}`,{signal}),
 kycDocument:(id:string,evidenceId:string,signal:AbortSignal)=>client.request<KycDocument>(`/ops/v1/onboarding/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`,{signal}),
 collections:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return client.request<OpsCollectionList>(`/ops/v1/collections?${p}`,{signal});},
 collection:(id:string,signal:AbortSignal)=>client.request<OpsCollection>(`/ops/v1/collections/${encodeURIComponent(id)}`,{signal}),
 payouts:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return client.request<OpsPayoutList>(`/ops/v1/payouts?${p}`,{signal});},
 payout:(id:string,signal:AbortSignal)=>client.request<OpsPayout>(`/ops/v1/payouts/${encodeURIComponent(id)}`,{signal}),
 providerEvent:(id:string,signal:AbortSignal)=>client.request<ProviderEvent>(`/ops/v1/provider-events/${encodeURIComponent(id)}`,{signal}),
 collectionReceipt:(id:string,signal?:AbortSignal)=>client.download(`/ops/v1/collections/${encodeURIComponent(id)}/receipt`,signal),
 holds:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return client.request<OpsHoldList>(`/ops/v1/holds?${p}`,{signal});},
 hold:(id:string,signal:AbortSignal)=>client.request<OpsHold>(`/ops/v1/holds/${encodeURIComponent(id)}`,{signal}),
 journals:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25',sort:'created_at_desc'});if(cursor)p.set('cursor',cursor);return client.request<OpsJournalList>(`/ops/v1/journals?${p}`,{signal});},
 journal:(id:string,signal:AbortSignal)=>client.request<OpsJournal>(`/ops/v1/journals/${encodeURIComponent(id)}`,{signal}),
 accounts:(filters:OpsFilters,cursor:string|null,signal:AbortSignal)=>client.request<OpsAccountList>(`/ops/v1/accounts?${params(filters,cursor)}`,{signal}),
 account:(id:string,signal:AbortSignal)=>client.request<OpsAccount>(`/ops/v1/accounts/${encodeURIComponent(id)}`,{signal}),
 operations:(filters:OpsFilters,cursor:string|null,signal:AbortSignal)=>client.request<OpsOperationList>(`/ops/v1/operations?${params(filters,cursor)}`,{signal}),
 operation:(id:string,signal:AbortSignal)=>client.request<OpsOperation>(`/ops/v1/operations/${encodeURIComponent(id)}`,{signal}),
 };
}
