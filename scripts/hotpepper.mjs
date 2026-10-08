import {accessFlags} from '../docs/lib.js';
export async function collectHotpepper(){
 const key=process.env.HOTPEPPER_API_KEY;if(!key)return [];
 const items=[];
 for(let start=1;start<=1000;start+=100){
  const url=new URL('https://webservice.recruit.co.jp/hotpepper/gourmet/v1/');
  url.search=new URLSearchParams({key,keyword:'鹿児島県',format:'json',count:'100',start:String(start)});
  let res;try{res=await fetch(url,{signal:AbortSignal.timeout(20000)});}catch{throw new Error('Hot Pepper API connection failed');}
  if(!res.ok)throw new Error(`Hot Pepper API HTTP ${res.status}`);
  const data=await res.json(),result=data.results;if(!result||result.error)throw new Error('Hot Pepper API rejected the request. Check the API key.');
  for(const shop of result.shop||[]){
   if(!shop.address?.startsWith('鹿児島県'))continue;
   const address=shop.address;
   const area=/鹿児島市/.test(address)?'鹿児島市・桜島':/霧島市|姶良市|伊佐市/.test(address)?'霧島・姶良':/指宿市|南さつま市|南九州市|枕崎市/.test(address)?'指宿・南薩摩':/日置市|いちき串木野市/.test(address)?'日置・いちき串木野':/鹿屋市|曽於市|志布志市|垂水市|肝属郡|曽於郡/.test(address)?'大隅':/西之表|熊毛郡|屋久島|種子島/.test(address)?'種子島・屋久島':/奄美市|大島郡|鹿児島郡/.test(address)?'奄美・離島':/薩摩川内|阿久根|出水|薩摩郡|出水郡/.test(address)?'北薩摩':'その他';
   items.push({id:'hotpepper-'+shop.id,url:shop.urls.pc,title:shop.name,type:'spot',area,address,genres:['グルメ・買い物'],dateText:'',ranges:[],cancelled:false,hours:shop.open||'',closed:shop.close||'',price:shop.budget?.average||'',access:shop.access||'',parking:shop.parking||'',...accessFlags(shop.access||'',shop.parking||''),image:shop.photo?.pc?.l||'',intro:shop.catch||shop.genre?.catch||'',venue:'',checkedAt:new Date().toISOString(),sourceName:'ホットペッパーグルメ',sourceUrl:'https://www.hotpepper.jp/'});
  }
  if(start+100>Number(result.results_available))break;
 }
 return items;
}
