const OUNCE_GRAMS=31.1034768;
function positive(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw new Error('Invalid price');return value}
function convertForex(fx){const inr=positive(fx.rates.INR);if(!/^\d{4}-\d{2}-\d{2}$/.test(fx.date))throw new Error('Missing FX date');return{usd:inr,eur:inr/positive(fx.rates.EUR),gbp:inr/positive(fx.rates.GBP),fxDate:fx.date}}
function indianQuote(payload,metal,now=Date.now()){
 if(payload.source!=='IBJA'||payload.metal!==metal||String(payload.purity)!=='999'||payload.unit!=='INR per gram'||!Array.isArray(payload.rows))throw new Error('Invalid Indian bullion response');
 const today=new Date(now+19800000).toISOString().slice(0,10);
 const rows=payload.rows.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(Date.parse(row.date))&&row.date<=today).sort((a,b)=>b.date.localeCompare(a.date));
 for(const row of rows){for(const session of ['pm','am']){if(typeof row[session]==='number'&&Number.isFinite(row[session])&&row[session]>0)return{price:row[session],date:row.date,session:session.toUpperCase()}}}
 throw new Error('No published AM/PM rate');
}
function convertIndianBullion(gold,silver,now=Date.now()){const g=indianQuote(gold,'gold',now),s=indianQuote(silver,'silver',now);return{gold:g.price*10,silver:s.price*100,goldAt:g.date,silverAt:s.date,goldSession:g.session,silverSession:s.session,bullionSource:'IBJA via TrackLivePrice'}}
function convertPlatinum(metal,inr){if(metal.currency!=='USD'||metal.symbol!=='XPT'||!Number.isFinite(Date.parse(metal.updatedAt)))throw new Error('Invalid platinum response');return{platinum:positive(metal.price)*positive(inr)*10/OUNCE_GRAMS,platinumAt:metal.updatedAt}}
function indian(value){const s=String(Math.round(positive(value)));return s.length<=3?s:s.slice(0,-3).replace(/\B(?=(\d{2})+(?!\d))/g,',')+','+s.slice(-3)}
function validGroup(rates,group){if(!rates||(group==='bullion'&&rates.bullionSource!=='IBJA via TrackLivePrice'))return false;return(group==='bullion'?['gold','silver']:group==='platinum'?['platinum']:['usd','eur','gbp']).every(key=>typeof rates[key]==='number'&&Number.isFinite(rates[key])&&rates[key]>0)}
function freshGroup(rates,group,now=Date.now()){if(!validGroup(rates,group))return false;const stamp=rates[group+'FetchedAt']===undefined?rates.fetchedAt:rates[group+'FetchedAt'];if(!Number.isFinite(stamp)||stamp>now)return false;return now-stamp<(group==='bullion'?3600000:86400000)}
