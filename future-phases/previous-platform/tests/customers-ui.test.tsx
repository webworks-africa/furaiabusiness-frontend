import {it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {http,HttpResponse} from 'msw';
import {AuthProvider,useAuth} from '../packages/platform/src/auth';
import {CustomersList} from '../packages/platform/src/customers';
import {HttpClient} from '../packages/api/src/http';
import {identityService} from '../packages/api/src/identity';
import {operationsService} from '../packages/api/src/operations';
import {server} from './setup';
async function login(){const client=new HttpClient('http://localhost');await identityService(client,'ops').login({identifier:'operator@staff.sandbox',challenge:'246810'});return operationsService(client);}
function mount(){function Ready(){return useAuth().loading?null:<CustomersList kind="customers"/>;}render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthProvider surface="ops" baseUrl="http://localhost"><MemoryRouter><Ready/></MemoryRouter></AuthProvider></QueryClientProvider>);}
it('shows loading then genuine empty customer state',async()=>{await login();let release!:()=>void;const block=new Promise<void>(r=>release=r);server.use(http.get('http://localhost/ops/v1/customers',async()=>{await block;return HttpResponse.json({data:[],page:{as_of:'2026-10-01T08:00:00Z',next_cursor:null,has_more:false}});}));mount();await screen.findByRole('status',{name:'Loading workspace'});release();await screen.findByRole('heading',{name:'No records are available'});});
it('propagates dependency failure and retries an actual request',async()=>{await login();let count=0;server.use(http.get('http://localhost/ops/v1/customers',()=>{count++;return HttpResponse.json({error:{code:'DEPENDENCY_UNAVAILABLE',message:'Customer service unavailable',details:{}},request_id:'failed'},{status:503});}));mount();await screen.findByText('Customer service unavailable');await userEvent.click(screen.getByRole('button',{name:'Try again'}));expect(count).toBe(2);});
