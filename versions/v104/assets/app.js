'use strict';
const $=id=>document.getElementById(id), cacheKey='rates-india-v3';
let rates=null,busy=false,peek=null,peekTimer,restoreTimer,requestId=0;
const pending=new Map();
window.rateResponse=(id,result)=>{const task=pending.get(id);if(!task)return;clearTimeout(task.timer);pending.delete(id);result.error?task.reject(new Error(result.error)):task.resolve(result.body)};
function json(url){return new Promise((resolve,reject)=>{const id=++requestId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Timeout'))},25000);pending.set(id,{resolve,reject,timer});try{AndroidRates.fetch(id,url)}catch(error){clearTimeout(timer);pending.delete(id);reject(error)}})}
function fit(){document.querySelectorAll('.metal').forEach(el=>{let size=$('dashboard').clientWidth*30/432;el.style.fontSize=size+'px';const width=()=>el.querySelector('.rupee').getBoundingClientRect().width+el.querySelector('.amount').getBoundingClientRect().width+parseFloat(getComputedStyle(el).columnGap);while(width()>el.clientWidth-1&&size>8){size-=.5;el.style.fontSize=size+'px'}});document.querySelectorAll('.fx').forEach(el=>{let size=$('dashboard').clientWidth*30/432;el.style.fontSize=size+'px';while(el.scrollWidth>el.clientWidth+1&&size>12){size-=.5;el.style.fontSize=size+'px'}})}
function toast(code){if(typeof AndroidRates!=='undefined'&&typeof AndroidRates.toast==='function')AndroidRates.toast(code)}
function stamp(group){return rates&&(rates[group+'FetchedAt']===undefined?rates.fetchedAt:rates[group+'FetchedAt'])}
function dateText(group){const value=stamp(group);return validGroup(rates,group)&&Number.isFinite(value)?new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Not collected'}
function draw(){if(rates&&typeof AndroidRates.saveWidgetRates==="function")AndroidRates.saveWidgetRates(JSON.stringify(rates));['gold','silver','platinum'].forEach(key=>{$(key).querySelector('.amount').textContent=validGroup(rates,key==='platinum'?'platinum':'bullion')?indian(rates[key]):'--';$(key).querySelector('.rupee').textContent=validGroup(rates,key==='platinum'?'platinum':'bullion')?'₹':''});['usd','eur','gbp'].forEach(key=>$(key).textContent=validGroup(rates,'forex')?rates[key].toFixed(2):'--');$('metals-date').textContent=dateText('bullion');$('forex-date').textContent=dateText('forex');$('quote-date').textContent=rates&&rates.fxDate?'Gold: '+(rates.goldAt||'--')+' '+(rates.goldSession||'')+' · Silver: '+(rates.silverAt||'--')+' '+(rates.silverSession||'')+' · Forex: '+rates.fxDate+'.':'';fit()}
const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function clock(){const d=new Date(),pad=n=>String(n).padStart(2,'0');$('time').textContent=pad(d.getHours())+':'+pad(d.getMinutes());$('date').textContent=peek||(busy?'REFRESHING':['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()]+' · '+pad(d.getDate())+' '+months[d.getMonth()])}
function peekText(group){const value=stamp(group);if(!validGroup(rates,group)||!Number.isFinite(value))return (group==='bullion'?'METALS':'FX')+' --';const d=new Date(value);return(group==='bullion'?'MET':'FX')+' '+String(d.getDate()).padStart(2,'0')+' '+months[d.getMonth()]}
function showUpdates(){clearTimeout(peekTimer);clearTimeout(restoreTimer);peek=peekText('bullion');clock();peekTimer=setTimeout(()=>{peek=peekText('forex');clock()},3000);restoreTimer=setTimeout(()=>{peek=null;clock()},6000)}
async function refresh(showToast=false){
 if(busy){if(showToast)toast('busy');return}
 const bullion=!freshGroup(rates,'bullion'),forex=!freshGroup(rates,'forex'),platinum=!freshGroup(rates,'platinum');
 if(!bullion&&!forex&&!platinum){draw();$('status').textContent='Saved rates are current · no refresh needed';if(showToast)toast('cached');return}
 if(showToast)toast((bullion||platinum)&&forex?'loading_all':(bullion||platinum)?'loading_metals':'loading_forex');
 busy=true;$('dashboard').classList.add('busy');$('refresh').disabled=true;$('refresh').textContent='Checking rates…';$('status').textContent='Fetching published rates…';clock();
 const cachedInr=rates&&Number.isFinite(rates.usd)&&rates.usd>0?rates.usd:null;
 const fx=forex||(platinum&&!cachedInr)?json('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR,EUR,GBP').then(convertForex):Promise.resolve(null);
 const result={},tasks=[];
 if(forex)tasks.push(fx.then(value=>{result.forex=value}).catch(()=>{}));
 if(bullion)tasks.push(Promise.all([json('https://trackliveprice.com/api/gold/999.json'),json('https://trackliveprice.com/api/silver.json')]).then(([g,s])=>{result.bullion=convertIndianBullion(g,s)}).catch(()=>{}));
 if(platinum)tasks.push(Promise.all([json('https://api.gold-api.com/price/XPT'),fx.then(value=>value?value.usd:cachedInr).catch(()=>cachedInr)]).then(([p,inr])=>{result.platinum=convertPlatinum(p,inr)}).catch(()=>{}));
 try{await Promise.all(tasks);const next={...rates};let updated=false,failed=false;for(const group of ['bullion','forex','platinum']){if(!({bullion,forex,platinum}[group]))continue;if(validGroup(result[group],group)){Object.assign(next,result[group]);next[group+'FetchedAt']=Date.now();updated=true}else failed=true}
 if(updated){rates=next;try{localStorage.setItem(cacheKey,JSON.stringify(rates))}catch(error){}draw();$('status').textContent=failed?'Partial update · unavailable rates retain saved readings':'Rates collected · saved on this phone'}else{$('status').textContent=rates?'Offline or rates unavailable · showing saved readings':'Rates unavailable · check internet and try again'}
 }finally{busy=false;$('dashboard').classList.remove('busy');$('refresh').disabled=false;$('refresh').textContent='Check rates';clock()}
}
try{const nativeSaved=typeof AndroidRates.widgetRates==='function'?AndroidRates.widgetRates():null;const saved=JSON.parse(localStorage.getItem(cacheKey)||nativeSaved);if(validGroup(saved,'bullion')||validGroup(saved,'forex'))rates=saved}catch(error){}
$('date').addEventListener('click',event=>{event.stopPropagation();showUpdates()});$('dashboard').addEventListener('click',()=>refresh(true));$('refresh').addEventListener('click',()=>refresh(true));new ResizeObserver(fit).observe($('dashboard'));draw();clock();setInterval(clock,1000);refresh(typeof AndroidRates.widgetCheck==='function'&&AndroidRates.widgetCheck());




const art=new Image();art.onload=()=>{const canvas=$('art');canvas.width=art.width;canvas.height=Math.round(art.width*514/432);const ctx=canvas.getContext('2d');ctx.scale(canvas.width/432,canvas.height/514);ctx.drawImage(art,0,0,432,514);for(const [y,h] of [[155,51],[224,51],[290,51]])ctx.drawImage(art,225/432*art.width,y/514*art.height,5/432*art.width,h/514*art.height,232,y,7,h)};art.src='background.png';
