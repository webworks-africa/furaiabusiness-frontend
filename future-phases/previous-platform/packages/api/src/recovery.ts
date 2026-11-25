import type {components} from '../../contracts/src/generated';
import type {HttpClient} from './http';
import {prefixes,type Surface} from '../../contracts/src';
import type {ImmutableCommand} from './money';
export async function inspectInterruptedOperation(client:HttpClient,surface:Surface,operationId:string,command:ImmutableCommand){
 const operation=await client.request<components['schemas']['Operation']>(`${prefixes[surface]}/operations/${encodeURIComponent(operationId)}`);
 // Read authority first. This helper never resubmits or invents a new key.
 return {operation,command,action:operation.state==='UNKNOWN'?'inquiry_only':operation.state==='SUCCEEDED'||operation.state==='FAILED'?'show_result':'check_status'} as const;
}
