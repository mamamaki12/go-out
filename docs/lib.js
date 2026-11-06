// 「令和8年」「令和元年」は西暦（2026年・2019年）にしてから読む
const westernYear=s=>s.replace(/令和\s*(元|\d{1,2})\s*年/g,(_,n)=>`${2018+(n==='元'?1:Number(n))}年`);
export function parseDates(text){
 let s=westernYear(String(text||'').normalize('NFKC'));const firstYear=s.search(/20\d{2}年/);if(firstYear<0)return [];
 s=s.slice(firstYear);const note=s.search(/※|例年|毎年/);if(note>0)s=s.slice(0,note);
 let year=Number(s.match(/(20\d{2})年/)?.[1]),month;const dates=[];
 const re=/(?:(20\d{2})年)?(?:(\d{1,2})月)?(\d{1,2})(?:日|(?=[(（～〜~、\s]))/g;let m;
 while((m=re.exec(s))){if(m[1])year=+m[1];if(m[2])month=m[2];if(!year||!month)continue;const date=`${year}-${month.padStart(2,'0')}-${m[3].padStart(2,'0')}`;const stamp=new Date(date+'T00:00:00Z');if(!Number.isFinite(stamp.getTime())||stamp.toISOString().slice(0,10)!==date)continue;dates.push({date,start:m.index,end:re.lastIndex});}
 const ranges=[];for(let i=0;i<dates.length;i++){const a=dates[i],b=dates[i+1];const between=b?s.slice(a.end,b.start):'';if(b&&/[～〜~―－-]/.test(between)&&between.length<24&&b.date>=a.date){ranges.push({start:a.date,end:b.date});i++;}else ranges.push({start:a.date,end:a.date});}return ranges;
}
export function accessFlags(access,parking){
 const car=/車|IC|ＩＣ|インター/.test(access)||!!parking&&!/なし|無し|ございません/.test(parking);
 const publicText=access.replace(/[［【\[]車[］】\]][\s\S]*?(?=[［【\[]|$)/g,'').split(' / ').filter(s=>!/車で|IC|ＩＣ|インター/.test(s)).join(' ');
 return {car,transit:/バス|市電|電停|ＪＲ|JR|駅|フェリー|船/.test(publicText)};
}
// 公式サイトのイベント・観光スポットの詳しいページのURL（似た名前の別のサイトは受け取らない）
export const EVENT_LINK=/^https:\/\/www\.kagoshima-kankou\.com\/event\/\d+$/;
export const GUIDE_LINK=/^https:\/\/www\.kagoshima-kankou\.com\/guide\/\d+$/;
// 中止・延期・休止のイベント（「雨天中止」などの注意書きは除く）
export function cancelledEvent(title,dateText){
 const all=`${title} ${dateText}`;
 return (/中止|延期/.test(all)||/休止/.test(title))&&!/荒天中止|雨天中止/.test(all);
}
// 開催日が分かっていて、すべて今日より前に終わったイベント
export function endedEvent(item,today=todayJST()){return item.type==='event'&&item.ranges.length>0&&item.ranges.every(r=>r.end<today);}
// 検索で、全角・半角、大文字・小文字、ひらがな・カタカナ、空白の違いを気にしない
export function searchText(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s+/g,'');}
export function todayJST(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});}
export function dateWindow(mode,custom,today=todayJST()){
 if(mode==='any')return null;if(mode==='custom')return custom?{start:custom,end:custom}:null;
 if(mode==='today')return {start:today,end:today};
 const d=new Date(today+'T00:00:00Z'),day=d.getUTCDay();const offset=day===0?0:6-day;d.setUTCDate(d.getUTCDate()+offset);const start=d.toISOString().slice(0,10);if(day!==0)d.setUTCDate(d.getUTCDate()+1);return {start,end:d.toISOString().slice(0,10)};
}
export function matches(item,filters){
 if(item.cancelled||endedEvent(item,filters.today))return false;
 if(filters.type!=='all'&&item.type!==filters.type)return false;
 if(filters.area&&item.area!==filters.area)return false;
 if(filters.genre&&!item.genres.includes(filters.genre))return false;
 if(filters.transport==='car'&&!item.car)return false;
 if(filters.transport==='transit'&&!item.transit)return false;
 if(filters.query&&!searchText(`${item.title}${item.venue||''}${item.address}${item.intro}`).includes(searchText(filters.query)))return false;
 if(item.type==='event'&&filters.window){if(!item.ranges.length)return false;return item.ranges.some(r=>r.start<=filters.window.end&&r.end>=filters.window.start);}
 return true;
}
