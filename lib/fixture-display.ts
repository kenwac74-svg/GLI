import { convertCurrency, formatConvertedMoney, formatConvertedMoneyRange, type ExchangeRateSnapshot, type PriceCurrency } from './currency.ts';
import type { UiLocale } from './ui-language.ts';

export function fixtureReference(source: string, period: string, locale: UiLocale, rates: ExchangeRateSnapshot['rates']): string | null {
  const match=source.match(/^(USD|\$|RM|₱)\s*([\d,.]+)([KM])?(?:~([\d,.]+)([KM])?)?(\/㎡)?$/);
  if(!match)return null;
  const currencies:Record<string,PriceCurrency>={USD:'USD','$':'USD',RM:'MYR','₱':'PHP'};
  const currency=currencies[match[1]],target=locale==='ko'?'KRW':'USD';
  if(currency===target)return '';
  const amount=(raw:string,unit?:string)=>Number(raw.replaceAll(',',''))*(unit==='M'?1e6:unit==='K'?1e3:1);
  const min=convertCurrency(amount(match[2],match[3]),currency,target,rates);
  const max=match[4]?convertCurrency(amount(match[4],match[5]),currency,target,rates):null;
  if(min===null || (match[4] && max===null))return null;
  const label=max!==null?formatConvertedMoneyRange(min,max,target,locale):formatConvertedMoney(min,target,locale);
  return `${locale==='ko'?'약 ':'Approx. '}${label}${match[6]??(period==='month'?(locale==='ko'?'/월':'/month'):'')}`;
}

export function fixturePosted(value:string,locale:UiLocale):string {
  const date=new Date(`${value}T00:00:00+09:00`);
  if(!Number.isFinite(date.getTime()))return '';
  const label=date.toLocaleDateString(locale==='ko'?'ko-KR':'en-US',{timeZone:'Asia/Seoul',year:'numeric',month:locale==='ko'?'long':'short',day:'numeric'});
  return locale==='ko'?`${label} 게시`:`Posted ${label}`;
}
