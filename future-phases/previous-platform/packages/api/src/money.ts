// Only formatting occurs in the browser. Balances remain server-authoritative.
export function formatMoney(minor:string,currency='KES',exponent=2):string {
 if(!/^-?(0|[1-9][0-9]*)$/.test(minor))throw new Error('Invalid integer minor-unit string');
 if(!Number.isInteger(exponent)||exponent<0||exponent>6)throw new Error('Invalid currency exponent');
 const value=BigInt(minor),negative=value<0n,absolute=negative?-value:value;
 const factor=10n**BigInt(exponent),whole=(absolute/factor).toLocaleString('en-KE');
 const fraction=exponent ? `.${(absolute%factor).toString().padStart(exponent,'0')}` : '';
 return `${currency} ${negative?'-':''}${whole}${fraction}`;
}
export type ImmutableCommand = Readonly<{key:string;payload:string}>;
export function freezeCommand(payload:Readonly<Record<string,unknown>>,key:string=crypto.randomUUID()):ImmutableCommand {
 return Object.freeze({key,payload:JSON.stringify(payload)});
}
// Future forms retain this object through retries; no key/payload recreation.
