import {todayJST,dateWindow,matches} from './lib.js';
const $=id=>document.getElementById(id);let data,kind='all',savedOnly=false,limit=24,saved=[];
try{const s=JSON.parse(localStorage.getItem('go-out-saved-v1'));if(Array.isArray(s))saved=s.filter(x=>typeof x==='string');}catch{}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3200);}
function toggle(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('go-out-saved-v1',JSON.stringify(saved));toast(saved.includes(id)?'行きたいリストに保存しました':'保存を解除しました');}catch{toast('ブラウザに保存できません。このページ内だけで保持します。');}render();}
function safeUrl(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function photo(item,cls){const img=el('img',cls);img.alt=item.title;img.loading='lazy';const u=safeUrl(item.image);if(u)img.src=u;img.onerror=()=>{img.removeAttribute('src');img.alt='写真は公式サイトでご確認ください';img.onerror=null;};return img;}
function actionLink(text,url,cls){const a=el('a',cls,text);a.href=safeUrl(url)||'#';a.target='_blank';a.rel='noopener noreferrer';return a;}
function filters(){return {type:kind,area:$('area').value,genre:$('genre').value,transport:$('transport').value,query:$('search').value.trim(),window:dateWindow($('when').value,$('custom-date').value)};}
function render(){
 if(!data)return;const f=filters();$('saved-count').textContent=saved.length;$('saved-toggle').setAttribute('aria-pressed',String(savedOnly));$('custom-wrap').hidden=$('when').value!=='custom';$('date-note').hidden=!f.window;
 $('filter-note').textContent=f.transport==='car'?'車のアクセス、または駐車場情報がある場所を表示しています。フェリーが必要な場合もあります。':f.transport==='transit'?'駅・バス・市電・船などのアクセス案内がある場所を表示しています。運行日や便数は経路検索で確認できます。':'移動手段を選ぶと、該当するアクセス情報がある場所に絞り込みます。';
 const items=data.items.filter(x=>matches(x,f)&&(!savedOnly||saved.includes(x.id))).sort((a,b)=>{if(a.type!==b.type)return a.type==='event'?-1:1;return (a.ranges[0]?.start||'9999').localeCompare(b.ranges[0]?.start||'9999');});
 $('count').textContent=`${items.length}件のよりみち`;$('cards').replaceChildren();
 for(const item of items.slice(0,limit)){
  const card=el('article','card'),image=el('div','image-wrap');image.append(photo(item));image.append(el('span','kind',item.type==='event'?'EVENT':'SPOT'));
  const save=el('button',`save ${saved.includes(item.id)?'saved':''}`,saved.includes(item.id)?'♥':'♡');save.setAttribute('aria-label',`${item.title}を${saved.includes(item.id)?'保存解除':'保存'}`);save.setAttribute('aria-pressed',String(saved.includes(item.id)));save.onclick=()=>toggle(item.id);image.append(save);
  const content=el('div','card-content');content.append(el('span','area',item.area+(item.sourceName?' · '+item.sourceName:'')));const title=el('button','card-title',item.title);title.onclick=()=>detail(item);content.append(title);
  const dateLabel=item.type==='event'?(item.ranges.length?item.dateText.slice(0,90):'開催日は公式情報で確認'):item.hours?item.hours.slice(0,70):'営業日・時間は公式情報で確認';content.append(el('p','card-date',dateLabel));const tags=el('div','card-tags');for(const tag of item.genres.slice(0,2))tags.append(el('span','',tag));content.append(tags);
  const bottom=el('div','card-bottom');bottom.append(el('span','',[item.car?'車の案内あり':'',item.transit?'公共交通の案内あり':''].filter(Boolean).join(' / ')||'アクセス要確認'));const open=el('button','','詳細を見る ↗');open.onclick=()=>detail(item);bottom.append(open);content.append(bottom);card.append(image,content);$('cards').append(card);
 }
 if(!items.length)$('cards').append(el('p','empty',savedOnly?'保存した場所がありません。♡から気になる場所を保存できます。':'この条件の候補が見つかりませんでした。\nエリアや日付、移動手段を変更してみてください。'));
 $('more').hidden=items.length<=limit;
}
function detail(item){
 const body=$('detail-body');body.replaceChildren(photo(item,'detail-image'));const content=el('div','detail-content');content.append(el('span','area',item.area),el('h2','',item.title),el('p','',item.intro));
 const facts=el('dl','facts');const rows=[['開催日',item.type==='event'?item.dateText:''],['場所',item.venue],['住所',item.address],['時間',item.hours],['休日',item.closed],['料金',item.price],['アクセス',item.access],['駐車場',item.parking]];for(const [key,value] of rows){if(!value)continue;const row=el('div');row.append(el('dt','',key),el('dd','',value));facts.append(row);}content.append(facts);
 const links=el('div','detail-links');links.append(actionLink(item.sourceName?'掲載元で確認 ↗':'公式情報を確認 ↗',item.url));
 const transport=$('transport').value,mode=transport==='car'?'driving':transport==='transit'?'transit':'';
 const destination=(item.address+' '+item.title.replace(/^20\d{2}\s*/,'' )).trim();
 links.append(actionLink(mode?'選んだ移動手段で経路を見る ↗':'Google マップで見る ↗',mode?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,'secondary'));
 const save=el('button','detail-save',saved.includes(item.id)?'♥ 保存済み':'♡ 行きたい');save.onclick=()=>{toggle(item.id);save.textContent=saved.includes(item.id)?'♥ 保存済み':'♡ 行きたい';};links.append(save);const credit=el('p','source-credit');credit.append(actionLink(item.sourceName?'Powered by '+item.sourceName:'情報・画像：鹿児島県観光サイト「かごしまの旅」',item.sourceUrl||'https://www.kagoshima-kankou.com/'),document.createTextNode(' / 確認 '+new Date(item.checkedAt).toLocaleDateString('ja-JP')));content.append(links,credit);body.append(content);$('detail').showModal();
}
$('close').onclick=()=>$('detail').close();$('detail').addEventListener('click',event=>{if(event.target===$('detail')){const r=$('detail').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('detail').close();}});
$('custom-date').value=todayJST();
for(const id of ['when','custom-date','area','genre','transport','search'])$(id).addEventListener(id==='search'?'input':'change',()=>{limit=24;render();});
document.querySelectorAll('[data-type]').forEach(button=>button.onclick=()=>{kind=button.dataset.type;document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});limit=24;render();});
$('saved-toggle').onclick=()=>{savedOnly=!savedOnly;limit=24;render();};$('more').onclick=()=>{limit+=24;render();};
$('clear').onclick=()=>{for(const id of ['area','genre','search'])$(id).value='';$('when').value='any';$('transport').value='any';savedOnly=false;kind='all';document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('selected',b.dataset.type==='all');b.setAttribute('aria-pressed',String(b.dataset.type==='all'));});limit=24;render();};
try{const r=await fetch('./data.json',{cache:'no-cache'});if(!r.ok)throw new Error();data=await r.json();if(data.items.some(x=>x.sourceName==='ホットペッパーグルメ')){const credit=el('p');credit.append(actionLink('Powered by ホットペッパーグルメ','https://www.hotpepper.jp/'));document.querySelector('footer').append(credit);}$('updated').textContent='最終更新 '+new Date(data.updatedAt).toLocaleString('ja-JP');render();}catch{$('count').textContent='読み込みに失敗しました';$('cards').append(el('p','empty','情報を読み込めませんでした。時間をおいて再読み込みしてください。'));}
