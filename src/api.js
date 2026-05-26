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
    current_price: p.current_price ?? p.avg_price ?? 0,
    eval_amount:   p.eval_amount   ?? (p.shares * (p.avg_price ?? 0)),
    pnl:           p.pnl           ?? 0,
    pnl_pct:       p.pnl_pct       ?? 0,
    peak_pnl_pct:  p.peak_pnl_pct  ?? 0,
  }))
  return {
    summary: {
      total_asset:   data.total_asset,
      total_pnl:     data.total_pnl,
      total_pnl_pct: data.total_pnl_pct,
      total_eval:    data.total_eval,
      cash:          data.cash,
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

export async function fetchStrategyStats() {
  const { data, error } = await supabase
    .from('trades')
    .select('strategy, action, pnl, pnl_pct')
    .eq('action', 'sell')
  if (error) throw error

  const strategies = ['ma_cross', 'breakout_52w', 'bb_reversal', 'rsi_reversal']
  const result = {}
  strategies.forEach(s => { result[s] = { trades: 0, wins: 0, totalPnl: 0, totalPnlPct: 0 } })

  data.forEach(t => {
    const key = t.strategy
    if (!result[key]) return
    result[key].trades++
    if ((t.pnl ?? 0) > 0) result[key].wins++
    result[key].totalPnl += t.pnl ?? 0
    result[key].totalPnlPct += t.pnl_pct ?? 0
  })

  return result
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
