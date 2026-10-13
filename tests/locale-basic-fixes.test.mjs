import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { translateUiText } from '../lib/ui-language.ts';
import { fixtureReference, fixturePosted } from '../lib/fixture-display.ts';
import { localizeDemoAsset } from '../lib/demo-asset-localization.ts';

test('retained Mantawi fixture has Korean display copy without rewriting external records',()=>{
  const fixture={id:'GLI-PT-PH-507',title:'Mantawi Residences Tower 1'};
  assert.equal(localizeDemoAsset(fixture).title,'만타위 레지던스 1차');
  assert.equal(localizeDemoAsset({...fixture,id:'fixture:'+fixture.id}).title,'만타위 레지던스 1차');
  assert.equal(localizeDemoAsset({...fixture,sourceUrl:'https://example.test/live'}).title,fixture.title);
});

test('fixture references use API rates and preserve per-area/month units and ranges',()=>{
  const rates={USD:1,KRW:1300,MYR:4,PHP:50};
  assert.equal(fixtureReference('$500','month','ko',rates),'약 ₩650,000/월');
  assert.equal(fixtureReference('$500','month','en',rates),'');
  assert.equal(fixtureReference('USD 7,000/㎡','','ko',rates),'약 ₩9,100,000/㎡');
  assert.equal(fixtureReference('₱ 4M~57M','','en',rates),'Approx. $80K~$1.1M');
  assert.equal(fixtureReference('자료상 가격 미기재','','en',rates),null);
  assert.equal(fixtureReference('$500','','ko',{}),null);
  assert.equal(fixturePosted('2026-07-06','en'),'Posted Jul 6, 2026');
  assert.equal(fixturePosted('2026-07-06','ko'),'2026년 7월 6일 게시');
});

test('MY and detail fixed copy is covered without rewriting unknown names', () => {
  for(const [ko,en] of [['로그아웃','Sign out'],['관심 자산','Saved assets'],['관심 자산에서 삭제','Remove saved asset'],['가격 미기재','Price not stated']]) {
    assert.equal(translateUiText(ko,'en'),en);
    assert.equal(translateUiText(ko,'ko'),ko);
  }
  for (const text of ['나의 투자 탐색','회원 정보, 멤버십과 관심 자산','로그인 후 투자 탐색을 이어가세요','ChatGPT로 로그인','침실','욕실','원문 게시일','GLI 수집 확인일','한국인 생활 인프라 접근성','프로젝트 유형','문의 접수 완료']) {
    assert.notEqual(translateUiText(text,'en'),text,text);
  }
  assert.equal(translateUiText('R&F City','en'),'R&F City');
});

test('locale switch refreshes server data and generated fixtures have typed display markers', () => {
  assert.doesNotMatch(fs.readFileSync('app/components/claude-design-shell.tsx','utf8'),/count\.textContent = visible === result\.matches\.length/);
  const provider=fs.readFileSync('app/components/ui-locale-provider.tsx','utf8');
  assert.match(provider,/router\.refresh\(\)/);
  const generated=fs.readFileSync('app/generated/claude-static.ts','utf8');
  assert.match(generated,/data-fixture-price/);
  assert.match(generated,/data-fixture-posted/);
  const generator=fs.readFileSync('scripts/render-claude-handoff.mjs','utf8');
  assert.match(generator,/html\[lang="en"\]/);
});
