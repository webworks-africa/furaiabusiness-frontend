import {it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {http,HttpResponse} from 'msw';
import {AuthProvider,useAuth} from '../packages/platform/src/auth';
import {LedgerList,LedgerDetail} from '../packages/platform/src/ledger';
import {HttpClient} from '../packages/api/src/http';
import {identityService} from '../packages/api/src/identity';
import {operationsService} from '../packages/api/src/operations';
import {server} from './setup';
async function login(){const client=new HttpClient('http://localhost');await identityService(client,'ops').login({identifier:'operator@staff.sandbox',challenge:'246810'});return operationsService(client);}
function mount(detail=false){function Ready(){return useAuth().loading?null:detail?<Routes><Route path="/ops/ledger/:id" element={<LedgerDetail kind="journals"/>}/></Routes>:<LedgerList kind="journals"/>;}render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthProvider surface="ops" baseUrl="http://localhost"><MemoryRouter initialEntries={detail?['/ops/ledger/test-journal']:['/ops/ledger']}><Ready/></MemoryRouter></AuthProvider></QueryClientProvider>);}
it('shows a loading state followed by a genuinely empty journal resource',async()=>{await login();let release!:()=>void;const blocked=new Promise<void>(r=>release=r);server.use(http.get('http://localhost/ops/v1/journals',async()=>{await blocked;return HttpResponse.json({data:[],page:{as_of:'2026-10-01T08:00:00Z',has_more:false,next_cursor:null}});}));mount();await screen.findByRole('status',{name:'Loading workspace'});expect(screen.queryByRole('table')).not.toBeInTheDocument();release();await screen.findByRole('heading',{name:'No records are available'});});
it('keeps an integrity mismatch visible and does not offer a browser correction',async()=>{const service=await login(),row=(await service.journals({},null,new AbortController().signal)).data[0]!;server.use(http.get('http://localhost/ops/v1/journals/test-journal',()=>HttpResponse.json({...row,credit_minor:'1'})));mount(true);expect(await screen.findByRole('alert')).toHaveTextContent('Journal integrity mismatch');expect(screen.queryByText(/Line totals agree:/)).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/edit|correct|delete/i})).not.toBeInTheDocument();await screen.findByRole('table',{name:'Immutable journal lines'});});
it('shows dependency failure and rate-limit cooldown without substituting financial lines',async()=>{await login();server.use(http.get('http://localhost/ops/v1/journals',()=>HttpResponse.json({error:{code:'RATE_LIMITED',message:'Evidence reads limited',details:{}},request_id:'limited'},{status:429,headers:{'Retry-After':'30'}})));mount();await screen.findByText('Retry available in 30 seconds.');expect(screen.getByRole('button',{name:'Refresh evidence'})).toBeDisabled();expect(screen.getByRole('button',{name:'Apply filters'})).toBeDisabled();expect(screen.queryByRole('table')).not.toBeInTheDocument();});
