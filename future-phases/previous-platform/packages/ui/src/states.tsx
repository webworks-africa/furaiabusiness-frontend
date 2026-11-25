import {AlertCircle,LockKeyhole} from 'lucide-react';
import {Button} from './button';
export function LoadingState(){return <div role="status" aria-label="Loading workspace" className="grid gap-4"><div className="skeleton h-8 w-1/3"/><div className="skeleton h-36"/><div className="skeleton h-56"/><span className="sr-only">Loading workspace</span></div>;}
export function ErrorState({message,onRetry,restricted=false}:{message:string;onRetry?:()=>void;restricted?:boolean}){return <section className="state-panel" role="alert">{restricted?<LockKeyhole size={24}/>:<AlertCircle size={24}/>}<h2>{restricted?'Access restricted':'Unable to load this workspace'}</h2><p>{message}</p>{onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}</section>;}
