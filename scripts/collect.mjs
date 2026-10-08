import {load} from 'cheerio';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseDates,accessFlags} from '../docs/lib.js';
const base='https://www.kagoshima-kankou.com';
const clean=s=>String(s||'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
async function html(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'GoOutKagoshima/1.0 (+https://github.com/mamamaki12/go-out)'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return load(await r.text());}
const links=new Set();const errors=[];
for(let page=1;page<=12;page++){
 try{const $=await html(`${base}/event?st=acs&vw=tile&page=${page}`);$('a[href]').each((_,el)=>{const u=$(el).attr('href');if(/^https:\/\/www.kagoshima-kankou.com\/event\/\d+$/.test(u))links.add(u);});}catch(e){errors.push(e.message);}
}
// Include each prefectural area instead of only the most popular city spots.
for(let area=1;area<=7;area++){
 try{const $=await html(`${base}/guide?rta%5B0%5D=${area}`);let n=0;$('a[href]').each((_,el)=>{const u=$(el).attr('href');if(/^https:\/\/www.kagoshima-kankou.com\/guide\/\d+$/.test(u)&&n++<18)links.add(u);});}catch(e){errors.push(e.message);}
}
let previous={items:[]};try{previous=JSON.parse(await readFile(new URL('../docs/data.json',import.meta.url)));}catch{}
const records=new Map(previous.items.map(x=>[x.url,x]));let success=0;
const urls=[...links];
for(let i=0;i<urls.length;i+=4){
 await Promise.all(urls.slice(i,i+4).map(async url=>{
  try{
   const $=await html(url);const h=$('h1').first().clone();h.find('span,template,favorite-button-component,.o-digest--list-favorite__box').remove();const title=clean(h.text());if(!title)throw new Error('No title');
   const fields={};$('table tr').each((_,row)=>{const key=clean($(row).find('th').text());const td=$(row).find('td').clone();td.find('br').replaceWith(' / ');if(key)fields[key]=clean(td.text());});
   const tags=$('a[href*="rtc%5B"]').map((_,el)=>clean($(el).text())).get();
   const areaText=clean($('a[href*="rta%5B"]').first().text());
   const address=fields['住所']||'';
   const area=address.includes('鹿児島市')?'鹿児島市・桜島':areaText.includes('霧島')?'霧島・姶良':areaText.includes('北薩摩')?'北薩摩':areaText.includes('中薩摩')?'日置・いちき串木野':areaText.includes('南薩摩')?'指宿・南薩摩':areaText.includes('大隅')?'大隅':/種子|屋久|熊毛|西之表/.test(areaText+address)?'種子島・屋久島':/奄美|大島郡|十島|三島|喜界|徳之島|沖永良部|与論/.test(areaText+address)?'奄美・離島':'その他';
   const dateText=fields['開催日']||'';const type=dateText?'event':'spot';
   const ranges=type==='event'?parseDates(dateText):[];
   const cancelled=type==='event'&&/中止|延期/.test(title+' '+dateText)&&!/荒天中止|雨天中止/.test(title+' '+dateText);
   const genreText=tags.join(' ')+' '+title;
   const genres=[];for(const [name,re] of [['自然・公園',/自然|花|公園|海水浴|海岸|滝|山|展望|庭園/],['温泉',/温泉|足湯|砂むし/],['グルメ・買い物',/グルメ|食|定期市|マルシェ|市場|物産|特産|カフェ|ショッピング/],['文化・体験',/文化|史跡|神社|寺|美術|博物|アート|歴史|体験|工芸|窯|音楽/],['祭り・イベント',/祭|花火|イルミ|イベント|スポーツ|スタンプ|キャンペーン/]])if(re.test(genreText))genres.push(name);
   if(!genres.length)genres.push(type==='event'?'祭り・イベント':'文化・体験');
   const access=fields['交通アクセス']||fields['アクセス']||'';const parking=fields['駐車場']||'';
   const {car,transit}=accessFlags(access,parking);
   const image=$('meta[property="og:image"]').attr('content')||'';
   const intro=clean($('meta[name="description"]').attr('content')).slice(0,115);
   records.set(url,{id:url.split('/').slice(-2).join('-'),url,title,type,area,address,genres,dateText,ranges,cancelled,hours:fields['開催時間']||fields['営業時間']||'',closed:fields['休日']||fields['休業日']||'',price:fields['料金']||'',access,parking,car,transit,image,intro,venue:fields['開催場所']||'',checkedAt:new Date().toISOString()});success++;
  }catch(e){errors.push(`${url}: ${e.message}`);}
 }));
 if(i%40===0)console.log(`Checked ${Math.min(i+4,urls.length)}/${urls.length}`);
}
if(!success)throw new Error('No detail pages collected; retaining previous data');
const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});
const items=[...new Map([...records.values()].map(x=>[x.title.replace(/\s/g,''),x])).values()].filter(x=>x.type==='spot'||(!x.cancelled&&(!x.ranges.length||x.ranges.some(r=>r.end>=today))));
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/data.json',import.meta.url),JSON.stringify({updatedAt:new Date().toISOString(),source:'かごしまの旅（鹿児島県観光サイト）',sourceUrl:base,items,health:{checked:success,errors:errors.length}}));
console.log(JSON.stringify({total:items.length,events:items.filter(x=>x.type==='event').length,spots:items.filter(x=>x.type==='spot').length,errors:errors.slice(0,8)}));
