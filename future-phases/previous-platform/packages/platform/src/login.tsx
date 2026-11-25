import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Link,Navigate,useLocation} from 'react-router-dom';
import {ShieldCheck} from 'lucide-react';
import {Button} from '../../ui/src/button';
import {ErrorState} from '../../ui/src/states';
import {bases} from '../../contracts/src';
import {useAuth} from './auth';
const schema=z.object({identifier:z.string().min(3,'Enter your sign-in identifier.').max(254),challenge:z.string().min(6,'Enter the six-character challenge.').max(128)});
const titles={ops:'Operations',customer:'Account Holder',partner:'Partner Platform'};
export function Login({mockMode}:{mockMode:boolean}){
 const {surface,session,login,startupError,retrySession,notice}=useAuth(),location=useLocation(),[error,setError]=useState('');
 const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});
 const raw=location.state as {returnTo?:string}|null;
 const base=bases[surface];const returnTo=raw?.returnTo && (raw.returnTo===base || raw.returnTo.startsWith(base+'/')) && !raw.returnTo.includes('?') ? raw.returnTo:base;
 if(startupError)return <div className="workspace"><ErrorState message={startupError.message} onRetry={retrySession}/></div>;
 if(session)return <Navigate to={returnTo} replace/>;
 return <div className="login-screen"><aside className="login-aside"><div><div className="wordmark">furaia<span>.</span></div><div className="surface-label">{titles[surface]}</div></div><div><ShieldCheck size={36}/><h1 className="mt-6">Your workspace.<br/>Your authorized scope.</h1><p>{surface==='ops'?'Secure access to Furaia operations and governed administration.':surface==='customer'?'Access your personal and business accounts.': 'Manage your organization’s integration with Furaia.'}</p></div><small>Separate identity boundary · {titles[surface]}</small></aside><main className="login-main"><div className="login-card">{mockMode && <span className="badge">SANDBOX · SIMULATED IDENTITY</span>}<h1>Sign in</h1><p>Continue to {titles[surface]}.</p>{notice && <p role="status" className="notice mt-4">{notice}</p>}<form onSubmit={handleSubmit(async input=>{setError('');try{await login(input);}catch(e){setError(e instanceof Error?e.message:'Sign-in unavailable.');}})} noValidate>{(error || Object.keys(errors).length>0) && <div role="alert" className="form-error">{error || 'Check the highlighted fields before continuing.'}</div>}<label htmlFor="identifier">Sign-in identifier<input id="identifier" autoComplete="username" aria-label="Sign-in identifier" aria-invalid={!!errors.identifier} aria-describedby={errors.identifier?'identifier-error':undefined} {...register('identifier')}/>{errors.identifier && <span id="identifier-error" className="field-error">{errors.identifier.message}</span>}</label><label htmlFor="challenge">Verification challenge<input id="challenge" type="password" autoComplete="one-time-code" aria-label="Verification challenge" aria-invalid={!!errors.challenge} aria-describedby={errors.challenge?'challenge-error':undefined} {...register('challenge')}/>{errors.challenge && <span id="challenge-error" className="field-error">{errors.challenge.message}</span>}</label><Button type="submit" disabled={isSubmitting}>{isSubmitting?'Verifying…':'Sign in'}</Button></form>{surface==='customer'&&<><Link className="record-link" to="/app/register">Create your Furaia profile</Link><Link className="quick-link" to="/app/recovery">Recover account access</Link></>}{mockMode && <div className="mock-hint">Use the development sign-in credentials in README.md.</div>}<p className="metadata">Africa/Nairobi · Credentials are never stored in localStorage.</p></div></main></div>;
}
