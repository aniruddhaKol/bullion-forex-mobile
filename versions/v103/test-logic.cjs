const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context=vm.createContext({Date,console});
vm.runInContext(fs.readFileSync(__dirname+'/assets/logic.js','utf8'),context);
const fx={date:'2026-10-08',rates:{INR:96.78,EUR:.89397,GBP:.75718}};
const f=context.convertForex(fx);
assert.equal(f.usd,96.78);assert.equal(f.eur,96.78/.89397);assert.equal(f.gbp,96.78/.75718);
const metals=['XAU','XAG','XPT'].map((symbol,i)=>({currency:'USD',symbol,price:[4200,58,1650][i],updatedAt:'2026-10-09T05:00:00Z'}));
const b=context.convertBullion(metals,96.78);
assert.ok(Math.abs(b.gold-4200*96.78*10/31.1034768)<1e-8);
assert.ok(Math.abs(b.silver-58*96.78*100/31.1034768)<1e-8);
assert.ok(Math.abs(b.platinum-1650*96.78*10/31.1034768)<1e-8);
assert.equal(context.indian(127906),'1,27,906');
assert.throws(()=>context.convertBullion(metals,null));
assert.throws(()=>context.convertForex({date:'bad',rates:fx.rates}));
const now=Date.now(),r={...f,...b,bullionFetchedAt:now-25*3600000,forexFetchedAt:now-60000};
assert.equal(context.freshGroup(r,'forex',now),true);
assert.equal(context.freshGroup(r,'bullion',now),false);
assert.equal(context.freshGroup({...r,forexFetchedAt:now+1},'forex',now),false);
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',clientWidth:id==='dashboard'?400:140,scrollWidth:140,style:{},classList:{add(){},remove(){}},querySelector(s){return node(id+s)},addEventListener(){}});return nodes.get(id)}
const requests=[],toasts=[],storage=new Map([[ 'rates-100g-v2',JSON.stringify(r) ]]);
const ui=vm.createContext({Date,console,Map,Number,Promise,setTimeout,clearTimeout,setInterval:()=>1,ResizeObserver:class{observe(){}},document:{getElementById:node,querySelectorAll:()=>[]},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},AndroidRates:{toast(code){toasts.push(code)},fetch(id,url){requests.push(url);setTimeout(()=>ui.rateResponse(id,{body:metals.find(m=>url.endsWith(m.symbol))}),0)}}});ui.window=ui;
vm.runInContext(fs.readFileSync(__dirname+'/assets/logic.js','utf8')+fs.readFileSync(__dirname+'/assets/app.js','utf8'),ui);
setTimeout(async()=>{assert.equal(requests.length,3);assert.ok(requests.every(url=>url.includes('gold-api')));const saved=JSON.parse(storage.get('rates-100g-v2'));assert.equal(saved.forexFetchedAt,r.forexFetchedAt);assert.ok(saved.bullionFetchedAt>r.bullionFetchedAt);await vm.runInContext('refresh(true)',ui);assert.equal(requests.length,3);assert.equal(toasts.at(-1),'cached');
 vm.runInContext('rates.bullionFetchedAt=Date.now()-25*3600000; AndroidRates.fetch=(id,url)=>setTimeout(()=>rateResponse(id,{error:"offline"}),0)',ui);const previousGold=saved.gold;await vm.runInContext('refresh(true)',ui);assert.equal(toasts.at(-1),'loading_metals');assert.equal(vm.runInContext('rates.gold',ui),previousGold);assert.ok(node('status').textContent.includes('saved'));console.log('PASS: exact conversions, validation, independent expiry, no redundant FX calls, cache persistence, offline fallback.');},100);

