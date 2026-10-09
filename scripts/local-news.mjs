import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const sources=[
 {name:'鹿児島経済新聞',url:'https://kagoshima.keizai.biz/rss.xml'},
 {name:'号外NET 鹿児島市',url:'https://kagoshima.goguynet.jp/feed/'},
 {name:'カゴシマニアックス',url:'https://kagoshimaniax.com/feed/'},
 {name:'カゴシマニアックス（新店）',url:'https://kagoshimaniax.com/topicnews/openclose/feed/'}
];
export function parseFeed(xml,source,now=Date.now()){
 const $=load(xml,{xmlMode:true});const items=[];
 $('item').each((_,node)=>{const n=$(node),title=n.find('title').text().trim(),url=n.find('link').text().trim();
 const raw=n.find('pubDate').text()||n.find('dc\\:date').text(),stamp=Date.parse(raw);
 if(!title||!/^https:\/\//.test(url)||!Number.isFinite(stamp)||stamp>now||now-stamp>180*86400000)return;
 const category=/新店|新規オープン|ニューオープン|開店|開業|オープン/.test(title)&&!/閉店|閉業/.test(title)?'new':/イベント|祭|マルシェ|開催|フェス|展示|個展|花火/.test(title)?'event':'local';
 items.push({id:createHash('sha256').update(url).digest('hex').slice(0,16),title,url,source:source.name,publishedAt:new Date(stamp).toISOString(),category});
 });return items;
}
export async function collectLocalNews(){
 const target=new URL('../docs/news.json',import.meta.url);let old={items:[]};try{old=JSON.parse(await readFile(target));}catch{}
 const items=[],status=[];
 for(const source of sources){try{const r=await fetch(source.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const xml=await r.text();if(!/<(?:rss|rdf:RDF)\b/.test(xml))throw Error();const found=parseFeed(xml,source);items.push(...found);status.push({name:source.name,ok:true,count:found.length});}catch{items.push(...old.items.filter(x=>x.source===source.name));status.push({name:source.name,ok:false});}}
 const unique=[...new Map(items.filter(x=>Date.now()-Date.parse(x.publishedAt)<=180*86400000).map(x=>[x.url,x])).values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 await writeFile(target,JSON.stringify({updatedAt:new Date().toISOString(),sources:status,items:unique}));console.log(JSON.stringify({news:unique.length,sources:status}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await collectLocalNews();
