export const OUNCE_GRAMS = 31.1034768
export function positive(value) {
  if (typeof value !== 'number' || !isFinite(value) || value <= 0) throw new Error('Invalid price')
  return value
}
export function convertRates(fx, metals) {
  const forex = convertForex(fx)
  return {...forex,...convertBullion(metals,forex.usd),fetchedAt:Date.now()}
}
export function convertForex(fx) {
  const inr = positive(fx.rates.INR)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fx.date)) throw new Error('Missing FX date')
  return {usd:inr,eur:inr/positive(fx.rates.EUR),gbp:inr/positive(fx.rates.GBP),fxDate:fx.date}
}
export function convertBullion(metals, inr) {
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
export function indian(value) {
  const s = String(Math.round(positive(value)))
  return s.length <= 3 ? s : s.slice(0,-3).replace(/\B(?=(\d{2})+(?!\d))/g,',')+','+s.slice(-3)
}
