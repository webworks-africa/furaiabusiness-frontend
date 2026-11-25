import {useEffect,useMemo,useState,useRef} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import type {ColumnDef} from '@tanstack/react-table';
import type {SessionRecord} from '../../contracts/src';
import {Button} from '../../ui/src/button';
import {DataTable} from '../../ui/src/data-table';
import {LoadingState,ErrorState} from '../../ui/src/states';
import {EmptyList} from '../../ui/src/list-state';
import {CursorPagination} from '../../ui/src/pagination';
import {useAuth} from './auth';
import {useCursorFilters} from './filters';
import {StepUpDialog} from './step-up';
import {ExportControl} from './export-control';
export function Access(){
 const {session,service,surface,generation,revalidate}=useAuth(),cache=useQueryClient();const pagination=useCursorFilters();const {filters,cursor}=pagination;
 const [search,setSearch]=useState(filters.q),[selected,setSelected]=useState<SessionRecord|null>(null),[error,setError]=useState('');
 const contextKey=`${session?.session_id}:${session?.active_scope_id}:${session?.environment}:${generation}`;
 const previousScope=useRef(`${session?.active_scope_id}:${session?.environment}`);
 useEffect(()=>setSearch(filters.q),[filters.q]);
 useEffect(()=>{const key=`${session?.active_scope_id}:${session?.environment}`;if(previousScope.current!==key){setSelected(null);setError('');pagination.first();previousScope.current=key;}},[session?.active_scope_id,session?.environment]);
 const query=useQuery({queryKey:[surface,'sessions',session?.principal_id,contextKey,filters,cursor],queryFn:({signal})=>service.sessions(filters,cursor,signal),enabled:!!session?.capabilities.includes('security.sessions.view'),retry:false});
 const columns=useMemo<ColumnDef<SessionRecord>[]>(()=>[
  {accessorKey:'label',header:'Session',cell:({row})=><span>{row.original.label}{row.original.is_current&&<span className="badge neutral ml-2">Current</span>}</span>},
  {accessorKey:'state',header:'State',cell:({getValue})=><span className="badge neutral">{String(getValue())}</span>},
  {accessorKey:'created_at',header:'Created · Africa/Nairobi',cell:({getValue})=>new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(String(getValue())))},
  {id:'actions',header:'Action',cell:({row})=>row.original.state==='ACTIVE'&&session?.capabilities.includes('security.sessions.revoke')?<Button variant="outline" onClick={()=>setSelected(row.original)} aria-label={row.original.is_current?'Revoke current session':`Revoke ${row.original.label}`}>{row.original.is_current?'Revoke current session':'Revoke'}</Button>:<span>—</span>},
 ],[session?.capabilities]);
 if(!session)return null;
 if(!session.capabilities.includes('security.sessions.view'))return <ErrorState restricted message="Session-history permission is not granted."/>;
 return <><div className="page-heading"><div><h1>Session and access</h1><p>Review sessions in your active context.</p></div><Button variant="outline" onClick={()=>{setError('');void revalidate().then(()=>query.refetch()).catch(e=>setError(e instanceof Error?e.message:'Access refresh unavailable.'));}}>Refresh access</Button></div>{error&&<p role="alert" className="form-error mb-4">{error}</p>}<section className="panel"><div className="list-filters"><form onSubmit={event=>{event.preventDefault();pagination.change({q:search.trim()});}}><label>Search sessions<input aria-label="Search sessions" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/></label><Button type="submit">Search</Button></form><label>State<select aria-label="Session state" value={filters.state} onChange={e=>pagination.change({state:e.target.value as typeof filters.state})}><option value="ALL">All states</option><option value="ACTIVE">Active</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option></select></label><Button variant="ghost" onClick={pagination.reset}>Reset filters</Button><span className="metadata">Newest first · 25 records per page</span></div>{query.isPending?<LoadingState/>:query.isError?<><ErrorState message={query.error.message} onRetry={()=>{void query.refetch();}}/><Button variant="outline" className="mt-4" onClick={pagination.first}>Return to first page</Button></>:query.data.data.length===0?<EmptyList filtered={filters.q!==''||filters.state!=='ALL'} onReset={pagination.reset}/>:<><DataTable data={query.data.data} columns={columns} caption="Scoped session history"/><CursorPagination count={query.data.data.length} hasMore={query.data.page.has_more} canPrevious={pagination.canPrevious} busy={query.isFetching} onNext={()=>{const next=query.data.page.next_cursor;if(next)pagination.next(next);}} onPrevious={pagination.previous} onFirst={pagination.first}/></>}{query.data&&<><p className="metadata">Snapshot: {new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(query.data.page.as_of))} · Africa/Nairobi</p><ExportControl key={contextKey} filters={filters} asOf={query.data.page.as_of}/></>}</section>{selected&&<StepUpDialog key={contextKey+selected.id} capability="security.sessions.revoke" resourceId={selected.id} title={selected.is_current?'Revoke this browser session':'Revoke selected session'} onCancel={()=>setSelected(null)} onVerified={async grant=>{await service.revokeSession(selected.id,selected.version,grant);setSelected(null);pagination.first();await cache.invalidateQueries({queryKey:[surface,'sessions']});if(selected.is_current)await revalidate();}}/>}<p className="metadata">Sandbox sessions and verification are simulated. Identity recovery and the complete Security pages remain scheduled in their page batches.</p></>;
}
