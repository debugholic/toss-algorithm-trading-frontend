import { supabase } from './supabase.js'

export async function fetchPortfolio() {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  const positions = (data.positions ?? []).map(p => ({
    ...p,
    market:        p.market ?? 'KR',
    current_price: p.current_price ?? p.avg_price ?? 0,
    eval_amount:   p.eval_amount   ?? (p.shares * (p.avg_price ?? 0)),
    pnl:           p.pnl           ?? 0,
    pnl_pct:       p.pnl_pct       ?? 0,
    peak_pnl_pct:  p.peak_pnl_pct  ?? 0,
  }))

  const krPositions = positions.filter(p => p.market !== 'US')
  const usPositions = positions.filter(p => p.market === 'US')
  const krEval = krPositions.reduce((sum, p) => sum + (p.eval_amount ?? 0), 0)
  const usEval = usPositions.reduce((sum, p) => sum + (p.eval_amount ?? 0), 0)

  return {
    summary: {
      total_asset:   data.total_asset,
      total_pnl:     data.total_pnl,
      total_pnl_pct: data.total_pnl_pct,
      total_eval:    data.total_eval,
      kr_eval:       krEval,
      us_eval:       usEval,
      cash:          data.cash,
      usd_rate:      data.usd_rate ?? null,
    },
    positions,
  }
}

export async function fetchTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('traded_at', { ascending: true })
  if (error) throw error
  return data.map(t => ({
    date:     t.traded_at.slice(0, 16).replace('T', ' '),
    type:     t.action.toUpperCase(),
    code:     t.ticker,
    name:     t.name,
    shares:   t.qty,
    price:    t.price,
    amount:   t.amount,
    pnl:      t.pnl,
    pnl_pct:  t.pnl_pct,
    strategy: t.strategy,
    market:   t.market ?? 'KR',
  }))
}

export async function fetchScans() {
  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .order('scanned_at', { ascending: true })
    .limit(7)
  if (error) throw error
  return data
}

export async function fetchPending() {
  const { data, error } = await supabase
    .from('pending_orders')
    .select('data')
    .eq('id', 1)
    .single()
  if (error) return {}
  return data?.data ?? {}
}

export async function fetchSnapshotHistory() {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('snapshotted_at, total_pnl_pct')
    .order('snapshotted_at', { ascending: true })
    .limit(500)
  if (error) throw error
  // 날짜별 마지막 스냅샷 하나만 사용 (하루 여러 번 저장되는 경우 대비)
  const byDate = {}
  data.forEach(d => {
    byDate[d.snapshotted_at.slice(0, 10)] = d
  })
  return Object.values(byDate).map(d => ({
    date: d.snapshotted_at.slice(0, 10),
    pnl_pct: Math.round(d.total_pnl_pct * 100) / 100,
  }))
}

export async function fetchStrategyStats() {
  const { data, error } = await supabase
    .from('trades')
    .select('strategy, action, pnl, pnl_pct')
  if (error) throw error

  const STRATEGIES = ['ma_cross', 'breakout_52w', 'bb_reversal', 'rsi_reversal']
  const map = {}
  STRATEGIES.forEach(s => { map[s] = { trades: 0, wins: 0, pnlSum: 0, pnlPctSum: 0 } })

  data.forEach(t => {
    if (t.action !== 'sell') return
    const s = t.strategy
    if (!map[s]) return
    map[s].trades++
    if ((t.pnl ?? 0) > 0) map[s].wins++
    map[s].pnlSum += t.pnl ?? 0
    map[s].pnlPctSum += t.pnl_pct ?? 0
  })

  return STRATEGIES.map(s => {
    const m = map[s]
    const hasTrades = m.trades > 0
    return {
      strategy: s,
      trades:   hasTrades ? m.trades : null,
      winRate:  hasTrades ? Math.round((m.wins / m.trades) * 100) : null,
      avgPnlPct: hasTrades ? +(m.pnlPctSum / m.trades).toFixed(2) : null,
      totalPnl:  hasTrades ? Math.round(m.pnlSum) : null,
    }
  })
}

export async function fetchConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('data')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data.data
}
