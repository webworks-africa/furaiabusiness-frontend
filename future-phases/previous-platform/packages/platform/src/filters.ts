import {useSearchParams} from 'react-router-dom';
import {useRef,useState} from 'react';
import type {SessionFilters} from '../../contracts/src';
export function useCursorFilters(){
 const [params,setParams]=useSearchParams(),history=useRef<(string|null)[]>([]),[historySize,setHistorySize]=useState(0);
 const state=params.get('state')??'ALL';
 const filters:SessionFilters={q:params.get('q')??'',state:['ACTIVE','REVOKED','EXPIRED'].includes(state)?state as SessionFilters['state']:'ALL',sort:'created_at_desc'};
 const cursor=params.get('cursor');
 function resetCursor(){history.current=[];setHistorySize(0);}
 function change(next:Partial<SessionFilters>){resetCursor();setParams(previous=>{const p=new URLSearchParams(previous);p.delete('cursor');for(const[k,v]of Object.entries(next)){if(v===''||v==='ALL')p.delete(k);else p.set(k,v);}return p;});}
 function first(){resetCursor();setParams(previous=>{const p=new URLSearchParams(previous);p.delete('cursor');return p;});}
 function next(value:string){history.current.push(cursor);setHistorySize(history.current.length);setParams(previous=>{const p=new URLSearchParams(previous);p.set('cursor',value);return p;});}
 function previous(){const value=history.current.pop();setHistorySize(history.current.length);setParams(previous=>{const p=new URLSearchParams(previous);if(value)p.set('cursor',value);else p.delete('cursor');return p;});}
 return {filters,cursor,change,first,next,previous,canPrevious:historySize>0,reset:()=>change({q:'',state:'ALL',sort:'created_at_desc'})};
}
