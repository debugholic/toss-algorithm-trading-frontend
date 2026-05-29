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
    .order('scanned_at', { ascending: false })
    .limit(10)
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
  const result = Object.values(byDate).map(d => ({
    date: d.snapshotted_at.slice(0, 10),
    pnl_pct: Math.round(d.total_pnl_pct * 100) / 100,
  }))
  // 차트가 0%에서 시작하도록 첫 데이터 하루 전 날짜에 0 포인트 추가
  if (result.length > 0) {
    const firstDate = new Date(result[0].date)
    firstDate.setDate(firstDate.getDate() - 1)
    result.unshift({ date: firstDate.toISOString().slice(0, 10), pnl_pct: 0 })
  }
  return result
}

// 카드 렌더링용 — active 전략만 (gate·filter 포함)
export async function fetchStrategies() {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true })
  if (error) throw error
  return data ?? []
}

// 레이블·버전 맵용 — type='strategy' 전체 (비활성 포함, 통계 표시에 필요)
export async function fetchStrategyMeta() {
  const { data } = await supabase
    .from('strategies')
    .select('id, name, version')
    .eq('type', 'strategy')
    .order('priority', { ascending: true })
  return data ?? []
}

// 과거 거래가 있었으나 strategies 테이블에 없는 완전 레거시 ID
// rsi_reversal·ma_cross 는 DB에 있으므로 fetchStrategyStats 가 자동 포함
const LEGACY_STRATEGY_IDS = []

export async function fetchStrategyStats() {
  // strategies 테이블의 모든 type='strategy' 항목 (활성+비활성) — 과거 거래 포함
  const { data: stratRows } = await supabase
    .from('strategies')
    .select('id')
    .eq('type', 'strategy')
    .order('priority', { ascending: true })

  const stratIds = stratRows?.length
    ? stratRows.map(s => s.id)
    : ['pullback', 'consolidation', 'rsi_bb_combo', 'breakout_52w', 'ma_cross',
       'ma_cross_pending', 'breakout_pending', 'volume_surge_pending']

  // bb_reversal·rsi_reversal은 DB에 없는 v1 레거시 → 별도 추가
  const allIds = [...stratIds, ...LEGACY_STRATEGY_IDS]

  const { data, error } = await supabase
    .from('trades')
    .select('strategy, action, pnl, pnl_pct')
  if (error) throw error

  const map = {}
  allIds.forEach(s => { map[s] = { trades: 0, wins: 0, pnlSum: 0, pnlPctSum: 0 } })

  data.forEach(t => {
    const action = t.action?.toLowerCase()
    if (action !== 'sell' && action !== 'stop') return
    // strategy가 "[\"ma_cross\"]" 형태의 JSON 배열 문자열로 저장된 경우 파싱
    let strategies = []
    if (Array.isArray(t.strategy)) {
      strategies = t.strategy
    } else if (typeof t.strategy === 'string') {
      try { strategies = JSON.parse(t.strategy) } catch { strategies = [t.strategy] }
    }
    strategies.forEach(s => {
      const key = s?.toLowerCase()
      if (!map[key]) return
      map[key].trades++
      if ((t.pnl ?? 0) > 0) map[key].wins++
      map[key].pnlSum += t.pnl ?? 0
      map[key].pnlPctSum += t.pnl_pct ?? 0
    })
  })

  return allIds.map(s => {
    const m = map[s]
    const hasTrades = m.trades > 0
    return {
      strategy:  s,
      trades:    hasTrades ? m.trades : null,
      wins:      hasTrades ? m.wins : null,
      losses:    hasTrades ? m.trades - m.wins : null,
      winRate:   hasTrades ? Math.round((m.wins / m.trades) * 100) : null,
      avgPnlPct: hasTrades ? +(m.pnlPctSum / m.trades).toFixed(2) : null,
      totalPnl:  hasTrades ? Math.round(m.pnlSum) : null,
    }
  })
}

// config.py STRATEGY_CHANGELOG 와 동기화
const VERSION_FALLBACK = [
  { version: 'v1', name: 'MA 크로스·RSI 역발산',            since: '2026-01-01' },
  { version: 'v2', name: '눌림목·조정구간 혼합전략',         since: '2026-05-27' },
  { version: 'v3', name: '임박 신호 전략 + Chronos 필터',   since: '2026-05-28' },
]

export async function fetchVersionPerformance() {
  // 버전 메타데이터 — 테이블 없으면 폴백
  let versions = VERSION_FALLBACK
  const { data: vData, error: vErr } = await supabase
    .from('strategy_versions')
    .select('*')
    .order('version', { ascending: true })
  if (!vErr && vData?.length) versions = vData

  // 전략 id → version 맵 (strategies 테이블 기준)
  const { data: stratMeta } = await supabase
    .from('strategies')
    .select('id, version')
  const stratVersionMap = {}
  ;(stratMeta ?? []).forEach(s => { stratVersionMap[s.id] = s.version ?? 'v1' })

  // 거래 데이터 (strategy 필드 포함 — 전략 고유 버전 조회용)
  const { data: trades, error: tErr } = await supabase
    .from('trades')
    .select('strategy, strategy_version, action, pnl, pnl_pct')
  if (tErr) throw tErr

  // 거래의 strategy_version 대신 전략 자체의 version으로 분류
  // (예: rsi_bb_combo = v2, ma_cross_pending = v3 — 전략이 어떤 버전에 도입됐는지 기준)
  function resolveVersion(t) {
    let sid = null
    if (Array.isArray(t.strategy))         sid = t.strategy[0]
    else if (typeof t.strategy === 'string') {
      try { sid = JSON.parse(t.strategy)[0] } catch { sid = t.strategy }
    }
    if (sid && stratVersionMap[sid]) return stratVersionMap[sid]
    return t.strategy_version || 'v1'
  }

  // 버전별 집계
  const map = {}
  trades.forEach(t => {
    const v = resolveVersion(t)
    if (!map[v]) map[v] = { buys: 0, closed: 0, wins: 0, pnlSum: 0, winPnl: 0, lossPnl: 0, pnlPctSum: 0 }
    if (t.action === 'buy') map[v].buys++
    if ((t.action === 'sell' || t.action === 'stop') && t.pnl != null) {
      const pnl = Number(t.pnl) || 0
      map[v].closed++
      if (pnl > 0) { map[v].wins++; map[v].winPnl += pnl }
      else          { map[v].lossPnl += pnl }
      map[v].pnlSum    += pnl
      map[v].pnlPctSum += Number(t.pnl_pct) || 0
    }
  })

  return versions.map(v => {
    const m = map[v.version] ?? { buys: 0, closed: 0, wins: 0, pnlSum: 0, winPnl: 0, lossPnl: 0, pnlPctSum: 0 }
    return {
      version:     v.version,
      name:        v.name,
      since:       v.since,
      description: v.description,
      buy_count:   m.buys,
      sell_count:  m.closed,
      win_rate:    m.closed > 0 ? Math.round(m.wins / m.closed * 1000) / 10 : null,
      total_pnl:   Math.round(m.pnlSum),
      win_pnl:     Math.round(m.winPnl),
      loss_pnl:    Math.round(m.lossPnl),
      avg_pnl_pct: m.closed > 0 ? Math.round(m.pnlPctSum / m.closed * 100) / 100 : null,
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
