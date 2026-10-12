// Collection time is local and independent of the provider's quote date.
export function validRates(rates) {
  return validGroup(rates,'bullion') && validGroup(rates,'forex')
}
export function validGroup(rates, group) {
  return !!rates && (group === 'bullion' ? ['gold','silver','platinum'] : ['usd','eur','gbp']).every(key =>
    typeof rates[key] === 'number' && isFinite(rates[key]) && rates[key] > 0)
}

export function freshRates(rates, now = Date.now()) {
  return freshGroup(rates,'bullion',now) && freshGroup(rates,'forex',now)
}
export function freshGroup(rates, group, now = Date.now()) {
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
