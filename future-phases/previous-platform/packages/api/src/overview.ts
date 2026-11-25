import type {HttpClient} from './http';
import type {OpsOverview,OpsOutbox,OpsOutboxList} from '../../contracts/src';
export type OverviewFilters={date:string;provider:string;currency:string};
export function overviewService(client:HttpClient){return {
 read:(filters:OverviewFilters,signal:AbortSignal)=>client.request<OpsOverview>(`/ops/v1/overview?${new URLSearchParams(filters)}`,{signal}),
 outbox:(filters:Readonly<Record<string,string>>,cursor:string|null,signal:AbortSignal)=>{const p=new URLSearchParams({...filters,limit:'25'});if(cursor)p.set('cursor',cursor);return client.request<OpsOutboxList>(`/ops/v1/outbox?${p}`,{signal});},
 event:(id:string,signal:AbortSignal)=>client.request<OpsOutbox>(`/ops/v1/outbox/${encodeURIComponent(id)}`,{signal}),
};}
