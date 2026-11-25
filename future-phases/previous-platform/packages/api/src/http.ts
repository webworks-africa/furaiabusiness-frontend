import type {ApiErrorBody} from '../../contracts/src';
export class ApiError extends Error {
  constructor(public status:number,public body:ApiErrorBody,public retryAfter:string|null=null){super(body.error.message);}
}
function readError(raw:unknown,requestId:string|null):ApiErrorBody{
 if(raw && typeof raw==='object' && 'error' in raw && raw.error && typeof raw.error==='object' && 'code' in raw.error && typeof raw.error.code==='string' && 'message' in raw.error && typeof raw.error.message==='string' && 'request_id' in raw && typeof raw.request_id==='string')return raw as ApiErrorBody;
 return {error:{code:'INVALID_RESPONSE',message:'The service returned an unreadable response.',details:{}},request_id:requestId??'unavailable'};
}
export class HttpClient {
 private csrf:string|undefined;
 private controllers=new Set<AbortController>();
 constructor(private baseUrl:string,private authorizationLost:(error:ApiError)=>void=()=>{}){}
 setCsrf(token:string|undefined){this.csrf=token;}
 cancelPending(){for(const controller of this.controllers)controller.abort();this.controllers.clear();}
 private async fetchResponse(path:string,options:RequestInit={}):Promise<Response>{
  const controller=new AbortController();this.controllers.add(controller);
  const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)controller.abort();
  const headers=new Headers(options.headers);headers.set('Accept',headers.get('Accept')??'application/json');
  if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');
  if(this.csrf && options.method && !['GET','HEAD'].includes(options.method))headers.set('X-CSRF-Token',this.csrf);
  try{
   const response=await fetch(`${this.baseUrl}${path}`,{...options,headers,credentials:'include',cache:'no-store',signal:controller.signal});
   if(!response.ok){const raw:unknown=await response.json().catch(()=>null);const error=new ApiError(response.status,readError(raw,response.headers.get('X-Request-Id')),response.headers.get('Retry-After'));if(response.status===401 || (response.status===403 && error.body.error.code==='AUTHORIZATION_REVOKED')){this.csrf=undefined;this.authorizationLost(error);}throw error;}
   return response;
  }finally{this.controllers.delete(controller);options.signal?.removeEventListener('abort',abort);}
 }
 async request<T>(path:string,options:RequestInit={}):Promise<T>{const response=await this.fetchResponse(path,options);if(response.status===204)return undefined as T;return await response.json() as T;}
 async download(path:string,signal?:AbortSignal):Promise<{blob:Blob;filename:string}>{
  const response=await this.fetchResponse(path,{headers:{Accept:'text/csv'},...(signal?{signal}:{})});
  const raw=response.headers.get('Content-Disposition')?.match(/filename="([^"\r\n]+)"/)?.[1]??'furaia-export.csv';const filename=raw.replace(/[^a-zA-Z0-9._-]/g,'_');
  return {blob:await response.blob(),filename};
 }
}
