import {useEffect,useState} from 'react';
import {Button} from '../../ui/src/button';
import {useAuth,sessionDeadline} from './auth';
export function SessionBanner(){
 const {session,serverOffset,extend}=useAuth(),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
 if(!session)return null;
 const seconds=Math.max(0,Math.ceil((sessionDeadline(session)-(now+serverOffset))/1000));
 if(seconds>session.warning_before_seconds)return null;
 return <section className="notice session-warning" aria-label="Session expiry warning"><div><h2>Your session will expire soon</h2><p>Time remaining: {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}. Extension is limited by the original session deadline.</p>{error && <p role="alert" className="field-error">{error}</p>}</div><Button disabled={busy} onClick={()=>{setBusy(true);setError('');void extend().catch(e=>setError(e instanceof Error?e.message:'Session extension unavailable.')).finally(()=>setBusy(false));}}>{busy?'Extending…':'Extend session'}</Button></section>;
}
