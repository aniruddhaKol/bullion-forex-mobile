const OUNCE_GRAMS = 31.1034768
function positive(value) {
  if (typeof value !== 'number' || !isFinite(value) || value <= 0) throw new Error('Invalid price')
  return value
}
function convertRates(fx, metals) {
  const forex = convertForex(fx)
  return {...forex,...convertBullion(metals,forex.usd),fetchedAt:Date.now()}
}
function convertForex(fx) {
  const inr = positive(fx.rates.INR)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fx.date)) throw new Error('Missing FX date')
  return {usd:inr,eur:inr/positive(fx.rates.EUR),gbp:inr/positive(fx.rates.GBP),fxDate:fx.date}
}
function convertBullion(metals, inr) {
  positive(inr)
  const out = {bullionInr:inr}
  ;['gold','silver','platinum'].forEach((key,i) => {
    const metal = metals[i]
    if (metal.currency !== 'USD' || metal.symbol !== ['XAU','XAG','XPT'][i] || !isFinite(Date.parse(metal.updatedAt))) throw new Error('Invalid metal response')
    out[key] = positive(metal.price)*inr*([10,100,10][i])/OUNCE_GRAMS
    out[key+'At'] = metal.updatedAt
  })
  return out
}
function indian(value) {
  const s = String(Math.round(positive(value)))
  return s.length <= 3 ? s : s.slice(0,-3).replace(/\B(?=(\d{2})+(?!\d))/g,',')+','+s.slice(-3)
}
// Collection time is local and independent of the provider's quote date.
function validRates(rates) {
  return validGroup(rates,'bullion') && validGroup(rates,'forex')
}
function validGroup(rates, group) {
  return !!rates && (group === 'bullion' ? ['gold','silver','platinum'] : ['usd','eur','gbp']).every(key =>
    typeof rates[key] === 'number' && isFinite(rates[key]) && rates[key] > 0)
}

function freshRates(rates, now = Date.now()) {
  return freshGroup(rates,'bullion',now) && freshGroup(rates,'forex',now)
}
function freshGroup(rates, group, now = Date.now()) {
  if (!validGroup(rates,group)) return false
  const stamp= rates[group+'FetchedAt'] === undefined ? rates.fetchedAt : rates[group+'FetchedAt']
  if(typeof stamp !== 'number' || !isFinite(stamp)) return false
  const age = now - stamp
  if (age < 0) return false
  const fetched = new Date(stamp), today = new Date(now)
  return age < 24 * 60 * 60 * 1000 || (
    fetched.getFullYear() === today.getFullYear() &&
    fetched.getMonth() === today.getMonth() &&
    fetched.getDate() === today.getDate())
}

