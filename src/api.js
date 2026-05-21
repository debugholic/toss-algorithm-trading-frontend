import { supabase } from './supabase.js'

export async function fetchPortfolio() {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return {
    summary: {
      total_asset:   data.total_asset,
      total_pnl:     data.total_pnl,
      total_pnl_pct: data.total_pnl_pct,
      total_eval:    data.total_eval,
      cash:          data.cash,
    },
    positions: data.positions ?? [],
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
  // pending_orders는 NAS 로컬 — Supabase 미지원, 빈 객체 반환
  return {}
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
