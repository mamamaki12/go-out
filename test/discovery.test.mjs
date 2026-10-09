import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed} from '../scripts/local-news.mjs';
test('RSS uses publication dates, rejects stale entries and unsafe links',()=>{
 const now=Date.parse('2026-10-09T00:00:00Z');
 const xml='<rss><channel>'+[
 ['カフェがオープン','https://example.com/new','2026-10-08'],
 ['古いイベント開催','https://example.com/old','2025-01-01'],
 ['イベント開催','javascript:alert(1)','2026-10-08'],
 ['店舗が閉店、移転オープン','https://example.com/closed','2026-10-08']
 ].map(([t,u,d])=>`<item><title>${t}</title><link>${u}</link><pubDate>${d}</pubDate></item>`).join('')+'</channel></rss>';
 const items=parseFeed(xml,{name:'test'},now);assert.equal(items.length,2);assert.equal(items[0].category,'new');assert.equal(items[1].category,'local');assert.equal(items[0].publishedAt,'2026-10-08T00:00:00.000Z');
});
