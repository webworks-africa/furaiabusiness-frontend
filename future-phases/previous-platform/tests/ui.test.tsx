import {it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider} from '../packages/platform/src/auth';
import {Login} from '../packages/platform/src/login';
import {formatMoney,freezeCommand} from '../packages/api/src/money';
import {DataTable} from '../packages/ui/src/data-table';
it('announces form validation and rejects invalid credentials without discarding input',async()=>{const user=userEvent.setup();render(<QueryClientProvider client={new QueryClient()}><AuthProvider surface="ops" baseUrl="http://localhost"><MemoryRouter><Login mockMode/></MemoryRouter></AuthProvider></QueryClientProvider>);await user.click(screen.getByRole('button',{name:'Sign in'}));expect(await screen.findByRole('alert')).toHaveTextContent('Check the highlighted fields');await user.type(screen.getByLabelText('Sign-in identifier'),'customer@customer.sandbox');await user.type(screen.getByLabelText('Verification challenge'),'246810');await user.click(screen.getByRole('button',{name:'Sign in'}));expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');expect(screen.getByLabelText('Sign-in identifier')).toHaveValue('customer@customer.sandbox');});
it('formats large and negative minor units without Number conversion',()=>{expect(formatMoney('9007199254740993123')).toBe('KES 90,071,992,547,409,931.23');expect(formatMoney('-101')).toBe('KES -1.01');expect(formatMoney('0')).toBe('KES 0.00');expect(()=>formatMoney('1.25')).toThrow();});
it('freezes the exact retry payload and key',()=>{const command=freezeCommand({amount_minor:'100'},'fixed-key');expect(Object.isFrozen(command)).toBe(true);expect(command).toEqual({key:'fixed-key',payload:'{"amount_minor":"100"}'});});
it('renders a keyboard-scrollable empty table without a false zero',()=>{render(<DataTable data={[]} columns={[{accessorKey:'id',header:'Account'}]} caption="Accounts"/>);expect(screen.getByRole('region',{name:'Accounts'})).toHaveAttribute('tabindex','0');expect(screen.getByText('No records are available.')).toBeVisible();});

it('shows session service failure instead of treating it as signed out',async()=>{
 const {http,HttpResponse}=await import('msw');const {server}=await import('./setup');server.use(http.get('http://localhost/ops/v1/sessions',()=>HttpResponse.json({error:{code:'DEPENDENCY_UNAVAILABLE',message:'Session service unavailable',details:{}},request_id:'startup'},{status:503})));
 render(<QueryClientProvider client={new QueryClient()}><AuthProvider surface="ops" baseUrl="http://localhost"><MemoryRouter><Login mockMode/></MemoryRouter></AuthProvider></QueryClientProvider>);expect(await screen.findByRole('alert')).toHaveTextContent('Session service unavailable');expect(screen.queryByRole('button',{name:'Sign in'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Try again'})).toBeVisible();
});
