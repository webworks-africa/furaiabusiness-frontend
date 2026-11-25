import type {OpsJournal} from '../../contracts/src';
export function journalIntegrity(journal:OpsJournal){
 try{
  if(!Number.isInteger(journal.currency_exponent)||journal.currency_exponent<0||journal.currency_exponent>6||journal.lines.length<2)return {valid:false,debit:'0',credit:'0'};
  let debit=0n,credit=0n;
  for(const line of journal.lines){if(!/^(0|[1-9][0-9]*)$/.test(line.amount_minor))return {valid:false,debit:'0',credit:'0'};if(line.side==='DEBIT')debit+=BigInt(line.amount_minor);else if(line.side==='CREDIT')credit+=BigInt(line.amount_minor);else return {valid:false,debit:'0',credit:'0'};}
  const valid=debit===credit&&debit>0n&&debit.toString()===journal.debit_minor&&credit.toString()===journal.credit_minor&& (journal.template!=='PT-15'||journal.reference_kind==='CASE'&&!!journal.maker_id&&!!journal.checker_id&&journal.maker_id!==journal.checker_id&&!!journal.proposal_digest);
  return {valid,debit:debit.toString(),credit:credit.toString()};
 }catch{return {valid:false,debit:'0',credit:'0'};}
}
