import type { ExchangeRateSnapshot } from './currency';

let request:Promise<ExchangeRateSnapshot|null>|null=null;
let expires=0;
// Share only a short-lived reference snapshot across listing/detail projections.
export function referenceExchangeRates():Promise<ExchangeRateSnapshot|null> {
  if(!request || Date.now()>=expires) {
    expires=Date.now()+5*60*1000;
    request=fetch('/api/exchange-rates',{headers:{accept:'application/json'}})
      .then(async response=>response.ok?await response.json() as ExchangeRateSnapshot:null)
      .catch(()=>null)
      .then(snapshot=>{if(!snapshot)expires=0;return snapshot;});
  }
  return request;
}
