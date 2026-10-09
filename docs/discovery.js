const $=id=>document.getElementById(id);let news=[],limit=5;
const labels={new:'新店の話題',event:'イベントの話題',local:'地域の話題'};
function node(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n;}
function link(title,url){const a=node('a',title);a.href=url;a.rel='noopener noreferrer';return a;}
function renderNews(){const category=$('news-kind').value,q=$('news-query').value.trim().toLowerCase();const found=news.filter(x=>(!category||x.category===category)&&(!q||x.title.toLowerCase().includes(q)));$('news-list').replaceChildren();$('news-count').textContent=found.length+'件';for(const x of found.slice(0,limit)){const card=node('article');card.append(node('small',`${labels[x.category]} · ${x.source} · 記事公開 ${new Date(x.publishedAt).toLocaleDateString('ja-JP')}`),link(x.title,x.url));$('news-list').append(card);}if(!found.length)$('news-list').append(node('p','この条件の記事はありません。'));$('news-more').hidden=found.length<=5;$('news-more').textContent=limit===5?'もっと見る（残り'+(found.length-5)+'件） ↓':'5件に折りたたむ ↑';$('news-more').setAttribute('aria-expanded',String(limit!==5));$('news-more').setAttribute('aria-controls','news-list');}
if(typeof document!=='undefined'){
 for(const id of ['news-kind','news-query'])$(id).addEventListener(id==='news-query'?'input':'change',()=>{limit=5;renderNews();});$('news-more').onclick=()=>{limit=limit===5?Infinity:5;renderNews();};
 try{const r=await fetch('./news.json',{cache:'no-cache'});if(!r.ok)throw Error();const data=await r.json();news=data.items;$('news-updated').textContent='取得確認 '+new Date(data.updatedAt).toLocaleString('ja-JP')+(data.sources.some(x=>!x.ok)?'（一部の配信元は更新できず、前回分を表示）':'');renderNews();}catch{$('news-count').textContent='読み込み失敗';$('news-list').append(node('p','地域ニュースを読み込めませんでした。時間をおいて再読み込みしてください。'));}
}
