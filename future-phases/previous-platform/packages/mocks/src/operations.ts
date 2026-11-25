import {http,HttpResponse,type JsonBodyType} from 'msw';
import type {Session,OpsAccount,OpsOperation} from '../../contracts/src';
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const stamp='2026-10-01T08:00:00Z';
const cursors=new Map<string,{digest:string;offset:number;expires:number}>();let sequence=0;
export function resetOperationsMocks(){cursors.clear();sequence=0;}
const reply=<T extends JsonBodyType>(data:T,status=200)=>HttpResponse.json(data,{status,headers:{'X-Request-Id':`ops-read-${++sequence}`}});
const fail=(status:number,code:string,message:string)=>reply({error:{code,message,details:{}},request_id:`ops-read-${sequence+1}`},status);
export function operationsDataset(session:Session){
 const scope=session.active_scope_id,offset=scope.endsWith('000001')?0:100;
 const accounts:OpsAccount[]=Array.from({length:32},(_,n)=>{const held=n===0?'125000':'0',posted=n===31?'0':n===1?'9007199254740993123':String(400000+n*10300);return {id:id(offset+n+1),scope_id:scope,environment:session.environment,owner_id:id(offset+500+n),owner_masked:`${offset?'Entity B':'Entity A'} customer ${String(n+1).padStart(2,'0')} · A*** K***`,product:n%2?'BUSINESS_CURRENT':'PERSONAL_CURRENT',currency:n%3?'KES':'USD',currency_exponent:2,state:n===31?'CLOSED':n===30?'SUSPENDED':'ACTIVE',posted_minor:posted,held_minor:held,available_minor:(BigInt(posted)-BigInt(held)).toString(),policy_version:3,created_at:new Date(Date.parse(stamp)-n*60000).toISOString(),as_of:stamp};});
 const operations:OpsOperation[]=Array.from({length:38},(_,n)=>{const account=accounts[n%32]!,state=n===0?'UNKNOWN':n%5===0?'FAILED':n%4===0?'PROCESSING':'SUCCEEDED',kind=n%3===0?'PAYOUT':n%3===1?'COLLECTION':'TRANSFER';return {id:id(offset+1000+n),rail_record_id:kind==='TRANSFER'?null:id(offset+1000+n).replace('10000000','30000000'),scope_id:scope,environment:session.environment,kind,state,amount_minor:n===0?'125000':String(10000+n*700),fee_minor:'250',currency:account.currency,currency_exponent:2,source_account_id:kind==='COLLECTION'?null:account.id,destination_account_id:kind==='COLLECTION'?account.id:null,business_reference:`SANDBOX-${offset}-${n+1}`,created_at:new Date(Date.parse(stamp)-n*60000).toISOString(),updated_at:stamp,status_url:`/ops/v1/operations/${id(offset+1000+n)}`,provider:kind==='TRANSFER'?'internal':'fake-rail',provider_reference:kind==='TRANSFER'?'—':`fake-accept-${offset+n}`,request_id:`request-${offset+n}`,correlation_id:`correlation-${offset+n}`,hold_minor:kind==='PAYOUT'&&['UNKNOWN','PROCESSING'].includes(state)?(n===0?'125000':String(10000+n*700)):'0',as_of:stamp,timeline:[{at:new Date(Date.parse(stamp)-n*60000).toISOString(),event:'Instruction accepted',reference:`request-${offset+n}`,detail:'One immutable sandbox instruction.'},{at:stamp,event:state==='UNKNOWN'?'Provider accepted; response timed out':state,reference:`fake-accept-${offset+n}`,detail:state==='UNKNOWN'?'Outcome remains uncertain. Hold retained. Status inquiry required; no resend.':'Synthetic provider evidence; no live rail integration.'}]};});
 for(const account of accounts){account.held_minor=operations.filter(o=>o.source_account_id===account.id).reduce((sum,o)=>sum+BigInt(o.hold_minor),0n).toString();account.available_minor=(BigInt(account.posted_minor)-BigInt(account.held_minor)).toString();}
 return {accounts,operations};
}
export function operationsHandlers(authorize:(surface:'ops',request:Request,write?:boolean,capability?:string)=>Session|Response){return (['accounts','operations'] as const).flatMap(kind=>{
 const capability=kind==='accounts'?'accounts.view':'operations.view',path=(detail:boolean)=>new RegExp(`^https?://[^/]+/ops/v1/${kind}${detail?'/[^/?]+':''}$`);
 return [http.get(path(false),({request})=>{
 const session=authorize('ops',request,false,capability);if(session instanceof Response)return session;
 const p=new URL(request.url).searchParams,limit=Number(p.get('limit')??25),q=p.get('q')??'',state=p.get('state')??'',currency=p.get('currency')??'',sort=p.get('sort')??'created_at_desc';
 const allowed=['q','state','currency','kind','provider','account','owner','product','from','to','sort','cursor','limit'];
 if([...p.keys()].some(k=>!allowed.includes(k))||q.length>100||!Number.isInteger(limit)||limit<1||limit>100||sort!=='created_at_desc'||(currency&&!['KES','USD'].includes(currency))||(state&&!(kind==='accounts'?['ACTIVE','SUSPENDED','CLOSED']:['ACCEPTED','PROCESSING','UNKNOWN','SUCCEEDED','FAILED']).includes(state))||(p.get('kind')&&!['TRANSFER','COLLECTION','PAYOUT'].includes(p.get('kind')!))||(p.get('product')&&!['BUSINESS_CURRENT','PERSONAL_CURRENT'].includes(p.get('product')!)))return fail(422,'VALIDATION_FAILED','Invalid list filters.');
 const from=p.get('from')??'',to=p.get('to')??'';
 if((from&&!Number.isFinite(Date.parse(from)))||(to&&!Number.isFinite(Date.parse(to)))||(from&&to&&Date.parse(from)>Date.parse(to)))return fail(422,'VALIDATION_FAILED','Use a valid date range.');
 const filterPairs=[...p.entries()].filter(([k])=>k!=='cursor').sort(([a],[b])=>a.localeCompare(b));
 const digest=JSON.stringify([session.principal_id,session.session_id,session.active_scope_id,session.environment,session.authorization_version,kind,filterPairs]),cursor=p.get('cursor');
 const stored=cursor?cursors.get(cursor):null;if(cursor&&(!stored||stored.digest!==digest||stored.expires<Date.now()))return fail(422,'CURSOR_INVALID','The cursor expired or belongs to different filters or access. Return to the first page.');
 const rows=operationsDataset(session)[kind].filter(row=>{
 if(state&&row.state!==state||currency&&row.currency!==currency)return false;
 if(!JSON.stringify(row).toLowerCase().includes(q.toLowerCase()))return false;
 if('owner_id' in row)return (!p.get('owner')||p.get('owner')===row.owner_id)&&(!p.get('product')||p.get('product')===row.product);
 return (!p.get('kind')||p.get('kind')===row.kind)&&(!p.get('provider')||p.get('provider')===row.provider)&&(!p.get('account')||p.get('account')===row.source_account_id||p.get('account')===row.destination_account_id)&&(!from||Date.parse(row.created_at)>=Date.parse(from))&&(!to||Date.parse(row.created_at)<=Date.parse(to));
 });
 const offset=stored?.offset??0,more=offset+limit<rows.length,next=more?`ops-cursor-${++sequence}`:null;if(next)cursors.set(next,{digest,offset:offset+limit,expires:Date.now()+1800000});
 return reply({data:rows.slice(offset,offset+limit),page:{next_cursor:next,has_more:more,as_of:stamp}});
 }),http.get(path(true),({request})=>{const session=authorize('ops',request,false,capability);if(session instanceof Response)return session;const wanted=new URL(request.url).pathname.split('/').at(-1);const row=operationsDataset(session)[kind].find(row=>row.id===wanted);return row?reply(row):fail(404,'RESOURCE_NOT_FOUND','This record is unavailable in the active entity.');})];
 });}
