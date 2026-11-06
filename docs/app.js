import {todayJST,dateWindow,matches,parseDates,cancelledEvent,showsSourceContent} from './lib.js?v=3';
const $=id=>document.getElementById(id);let data,kind='all',savedOnly=false,limit=24,saved=[];
try{const s=JSON.parse(localStorage.getItem('go-out-saved-v1'));if(Array.isArray(s))saved=s.filter(x=>typeof x==='string');}catch{}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3200);}
function toggle(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('go-out-saved-v1',JSON.stringify(saved));toast(saved.includes(id)?'行きたいリストに保存しました':'保存を解除しました');}catch{toast('ブラウザに保存できません。このページ内だけで保持します。');}render();}
function safeUrl(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
// 写真は、載せてよい情報源（ホットペッパーグルメ）のものだけ出す。ほかは種類の名前を書いた枠にして、写真は掲載元のページで見てもらう
function photo(item,cls){const u=showsSourceContent(item)?safeUrl(item.image):null;if(!u){const box=el('div',cls?`no-photo ${cls}`:'no-photo');box.setAttribute('aria-hidden','true');box.append(el('span','no-photo-genre',item.genres?.[0]||'よりみち'),el('span','no-photo-note','写真は掲載元で'));return box;}const img=el('img',cls);img.alt=item.title;img.loading='lazy';img.src=u;img.onerror=()=>{img.removeAttribute('src');img.alt='写真は公式サイトでご確認ください';img.onerror=null;};return img;}
function actionLink(text,url,cls){const a=el('a',cls,text);a.href=safeUrl(url)||'#';a.rel='noopener noreferrer';return a;}
function filters(){const today=todayJST();return {type:kind,area:$('area').value,genre:$('genre').value,transport:$('transport').value,query:$('search').value.trim(),window:dateWindow($('when').value,$('custom-date').value,today),today};}
// 「a / / b」のように続いた区切りを1つにする。詳しい画面では区切りを改行にして読みやすくする
const tidy=s=>String(s||'').replace(/ \/(?: \/)+ /g,' / ');
const lines=s=>String(s||'').replace(/(?: \/)+ /g,m=>m.length>3?'\n\n':'\n');
function clearFilters(keepSaved){for(const id of ['area','genre','search'])$(id).value='';$('when').value='any';$('transport').value='any';if(!keepSaved)savedOnly=false;kind='all';document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('selected',b.dataset.type==='all');b.setAttribute('aria-pressed',String(b.dataset.type==='all'));});limit=24;render();}
function render(){
 if(!data)return;const f=filters();
 // 「行きたい」の数は、今も載っている（終了・中止していない）場所だけ数える
 const live=data.items.filter(x=>saved.includes(x.id)&&matches(x,{type:'all',transport:'any',today:f.today}));$('saved-count').textContent=live.length;$('saved-toggle').setAttribute('aria-pressed',String(savedOnly));$('custom-wrap').hidden=$('when').value!=='custom';$('date-note').hidden=!f.window;
 $('filter-note').textContent=f.transport==='car'?'車のアクセス、または駐車場情報がある場所を表示しています。フェリーが必要な場合もあります。':f.transport==='transit'?'駅・バス・市電・船などのアクセス案内がある場所を表示しています。運行日や便数は経路検索で確認できます。':'移動手段を選ぶと、該当するアクセス情報がある場所に絞り込みます。';
 const items=data.items.filter(x=>matches(x,f)&&(!savedOnly||saved.includes(x.id))).sort((a,b)=>{if(a.type!==b.type)return a.type==='event'?-1:1;return (a.ranges[0]?.start||'9999').localeCompare(b.ranges[0]?.start||'9999');});
 $('count').textContent=`${items.length}件のよりみち`;$('cards').replaceChildren();
 $('jump').hidden=false;$('jump').textContent=items.length?(savedOnly?`保存した${items.length}件を見る ↓`:`${items.length}件のよりみちを見る ↓`):'条件に合う場所はありません ↓';
 for(const item of items.slice(0,limit)){
  const card=el('article','card'),image=el('div','image-wrap');card.onclick=()=>detail(item);image.append(photo(item));image.append(el('span','kind',item.type==='event'?'EVENT':'SPOT'));
  const save=el('button',`save ${saved.includes(item.id)?'saved':''}`,saved.includes(item.id)?'♥':'♡');save.setAttribute('aria-label',`${item.title}を${saved.includes(item.id)?'保存解除':'保存'}`);save.setAttribute('aria-pressed',String(saved.includes(item.id)));save.onclick=event=>{event.stopPropagation();toggle(item.id);};image.append(save);
  const content=el('div','card-content');content.append(el('span','area',item.area+(item.sourceName?' · '+item.sourceName:'')));const title=el('button','card-title',item.title);title.setAttribute('aria-label',item.title+'の詳細を見る');content.append(title);
  const dateLabel=item.type==='event'?(item.ranges.length?tidy(item.dateText).slice(0,90):item.dateText?`${tidy(item.dateText).slice(0,60)}（今年の日程は公式情報で確認）`:'開催日は公式情報で確認'):item.hours?tidy(item.hours).slice(0,70):'営業日・時間は公式情報で確認';content.append(el('p','card-date',dateLabel));const tags=el('div','card-tags');for(const tag of item.genres.slice(0,2))tags.append(el('span','',tag));content.append(tags);
  const bottom=el('div','card-bottom');bottom.append(el('span','',[item.car?'車の案内あり':'',item.transit?'公共交通の案内あり':''].filter(Boolean).join(' / ')||'アクセス要確認'));content.append(bottom);card.append(image,content);$('cards').append(card);
 }
 if(!items.length){
  // 何も出ないとき：どうすれば出るかを書き、条件をはずすボタンも出す（「行きたい」の表示はそのまま）
  const box=el('div','empty'),narrowed=f.window||f.area||f.genre||f.query||f.transport!=='any'||f.type!=='all';
  box.append(el('p','',savedOnly?(live.length?'保存した場所のうち、今の条件に合うものはありません。':`保存した場所がありません。♡から気になる場所を保存できます。${saved.length?'（開催が終わったイベントは、一覧から消えます）':''}`):'この条件の候補が見つかりませんでした。エリアや日付、移動手段を変えてみてください。'));
  if(narrowed&&(!savedOnly||live.length)){const b=el('button','more','条件をはずして見る');b.onclick=()=>clearFilters(true);box.append(b);}
  $('cards').append(box);
 }
 $('more').hidden=items.length<=limit;
}
function detail(item){
 const body=$('detail-body');body.replaceChildren(photo(item,'detail-image'));const content=el('div','detail-content');content.append(el('span','area',item.area),el('h2','',item.title),showsSourceContent(item)?el('p','',item.intro):el('p','source-note','写真と紹介文は、掲載元のページでご覧ください。'));
 const facts=el('dl','facts');const rows=[['開催日',item.type==='event'?item.dateText:''],['場所',item.venue],['住所',item.address],['時間',item.hours],['休日',item.closed],['料金',item.price],['アクセス',item.access],['駐車場',item.parking]];for(const [key,value] of rows){if(!value)continue;const row=el('div');row.append(el('dt','',key),el('dd','',lines(value)));facts.append(row);}content.append(facts);
 const links=el('div','detail-links');links.append(actionLink(item.sourceName?'掲載元で確認 ↗':'公式情報を確認 ↗',item.url));
 const transport=$('transport').value,mode=transport==='car'?'driving':transport==='transit'?'transit':'';
 const destination=(item.address+' '+item.title.replace(/^20\d{2}\s*/,'' )).trim();
 links.append(actionLink(mode?'選んだ移動手段で経路を見る ↗':'Google マップで見る ↗',mode?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,'secondary'));
 const save=el('button','detail-save',saved.includes(item.id)?'♥ 保存済み':'♡ 行きたい');save.onclick=()=>{toggle(item.id);save.textContent=saved.includes(item.id)?'♥ 保存済み':'♡ 行きたい';};links.append(save);const credit=el('p','source-credit');credit.append(actionLink(item.sourceName?'Powered by '+item.sourceName:'情報：鹿児島県観光サイト「かごしまの旅」',item.sourceUrl||'https://www.kagoshima-kankou.com/'),document.createTextNode(' / 確認 '+new Date(item.checkedAt).toLocaleDateString('ja-JP')));content.append(links,credit);body.append(content);$('detail').showModal();
}
$('close').onclick=()=>$('detail').close();$('detail').addEventListener('click',event=>{if(event.target===$('detail')){const r=$('detail').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('detail').close();}});
$('custom-date').value=todayJST();
for(const id of ['when','custom-date','area','genre','transport','search'])$(id).addEventListener(id==='search'?'input':'change',()=>{limit=24;render();});
document.querySelectorAll('[data-type]').forEach(button=>button.onclick=()=>{kind=button.dataset.type;document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});limit=24;render();});
$('saved-toggle').onclick=()=>{savedOnly=!savedOnly;limit=24;render();};$('more').onclick=()=>{limit+=24;render();};
$('clear').onclick=()=>clearFilters(false);
$('jump').onclick=()=>$('results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
try{const r=await fetch('./data.json',{cache:'no-cache'});if(!r.ok)throw new Error();data=await r.json();
 // 開催日が読めていないイベントは、今の読み方（令和の年・休止など）で読み直す（終わった・中止のイベントを、次の更新を待たずに外せるように）
 for(const x of data.items)if(x.type==='event'){if(!x.ranges?.length&&x.dateText)x.ranges=parseDates(x.dateText);x.cancelled=x.cancelled||cancelledEvent(x.title,x.dateText);}
 if(data.items.some(x=>x.sourceName==='ホットペッパーグルメ')){const credit=el('p');credit.append(actionLink('Powered by ホットペッパーグルメ','https://www.hotpepper.jp/'));document.querySelector('footer').append(credit);}$('updated').textContent='最終更新 '+new Date(data.updatedAt).toLocaleString('ja-JP');render();}catch{$('count').textContent='読み込みに失敗しました';$('cards').append(el('p','empty','情報を読み込めませんでした。時間をおいて再読み込みしてください。'));}
