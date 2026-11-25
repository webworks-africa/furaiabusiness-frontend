import type {Surface,SessionExportRequest,ExportJob,StepUpGrant} from '../../contracts/src';
import {prefixes} from '../../contracts/src';
import type {HttpClient} from './http';
export function exportService(client:HttpClient,surface:Surface){
 const prefix=prefixes[surface];
 return {
  create:(payload:SessionExportRequest,key:string,grant:StepUpGrant)=>client.request<ExportJob>(`${prefix}/exports`,{method:'POST',headers:{'Idempotency-Key':key,'X-Step-Up-Id':grant.id},body:JSON.stringify(payload)}),
  status:(id:string,signal?:AbortSignal)=>client.request<ExportJob>(`${prefix}/exports/${encodeURIComponent(id)}`,signal?{signal}:{}),
  download:(id:string,signal?:AbortSignal)=>client.download(`${prefix}/exports/${encodeURIComponent(id)}/download`,signal),
 };
}
