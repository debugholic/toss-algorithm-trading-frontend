<template>
  <div>
    <h1>전략 현황</h1>
    <p class="caption" v-if="cfg">
      시장 국면(ADX+DI)에 따라 전략이 자동 선택됩니다 · 마지막 스캔: {{ lastScanDate }}
    </p>

    <div v-if="cfg" class="strategy-layout">

      <!-- 전략 버전 비교 -->
      <div class="version-section">
        <div class="version-header">
          <div class="section-title">전략 버전 비교</div>
          <span v-if="versionPerf.length" class="current-tag">
            현재 {{ versionPerf[versionPerf.length - 1].version }}
          </span>
        </div>
        <div class="ver-cols">
          <div v-for="v in versionPerf" :key="v.version" class="ver-col">
            <div class="ver-top">
              <span :class="['ver-badge', `ver-${v.version}`, { active: v.version === versionPerf[versionPerf.length - 1]?.version }]">{{ v.version }}</span>
              <span class="ver-name">{{ v.name }}</span>
            </div>
            <div v-if="v.sell_count === 0" class="ver-empty">집계 중</div>
            <template v-else>
              <div class="ver-bar-wrap">
                <div class="ver-bar-track">
                  <div class="ver-bar-fill" :class="pnlClass((v.win_rate ?? 0) - 50)" :style="{ width: (v.win_rate ?? 0) + '%' }"></div>
                </div>
                <span class="ver-bar-label" :class="pnlClass((v.win_rate ?? 0) - 50)">{{ v.win_rate }}%</span>
              </div>
              <div class="ver-sub">
                청산 {{ v.sell_count }}건 ·
                평균 <span :class="pnlClass(v.avg_pnl_pct)">{{ v.avg_pnl_pct != null ? (v.avg_pnl_pct > 0 ? '+' : '') + v.avg_pnl_pct + '%' : '-' }}</span> ·
                <span :class="pnlClass(v.total_pnl)">{{ formatPnl(v.total_pnl) }}원</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 전략별 성과: 접기/펼치기 -->
      <div class="perf-section">
        <div class="perf-header" @click="perfOpen = !perfOpen">
          <div class="section-title">전략별 성과</div>
          <span class="toggle-btn">{{ perfOpen ? '▲ 접기' : '▼ 펼치기' }}</span>
        </div>

        <!-- 펼친 상태: 전체 테이블 -->
        <table v-if="perfOpen" class="perf-table">
          <thead>
            <tr>
              <th>전략명</th>
              <th>거래수</th>
              <th>승률</th>
              <th>평균수익률</th>
              <th>총손익</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in strategyStats" :key="row.strategy">
              <td>{{ strategyLabelMap[row.strategy] ?? row.strategy }}<span :class="['ver-badge', `ver-${strategyVersionMap[row.strategy] ?? 'v1'}`]" style="margin-left:6px">{{ strategyVersionMap[row.strategy] ?? 'v1' }}</span></td>
              <td>{{ row.trades ?? '-' }}</td>
              <td>{{ row.winRate != null ? row.winRate + '%' : '-' }}</td>
              <td :class="pnlClass(row.avgPnlPct)">{{ row.avgPnlPct != null ? (row.avgPnlPct > 0 ? '+' : '') + row.avgPnlPct + '%' : '-' }}</td>
              <td :class="pnlClass(row.totalPnl)">{{ row.totalPnl != null ? formatPnl(row.totalPnl) : '-' }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 닫힌 상태: 요약 -->
        <div v-else class="perf-summary">
          <div v-for="row in strategyStats" :key="row.strategy" class="perf-chip">
            <span class="chip-name">{{ strategyLabelMap[row.strategy] ?? row.strategy }}<span :class="['ver-badge', `ver-${strategyVersionMap[row.strategy] ?? 'v1'}`]" style="margin-left:6px">{{ strategyVersionMap[row.strategy] ?? 'v1' }}</span></span>
            <span v-if="row.trades" class="chip-stats">
              <span :class="pnlClass(row.winRate - 50)">승률 {{ row.winRate }}%</span>
              <span class="chip-sep">·</span>
              <span :class="pnlClass(row.totalPnl)">{{ formatPnl(row.totalPnl) }}원</span>
            </span>
            <span v-else class="chip-no-data">-</span>
          </div>
        </div>
      </div>

      <!-- 전략 카드: 게이트·전략·필터 전체 동적 렌더링 (데스크탑 2열 / 모바일 스와이프) -->
      <div class="carousel-wrap">
      <div class="strategy-grid" ref="gridRef">

        <div
          v-for="strat in strategies"
          :key="strat.id"
          :class="['card', strat.card_color, { 'gate-card': strat.type !== 'strategy' }]"
        >
          <div class="card-title">
            {{ strat.icon }} {{ strat.name }}
            <span :class="['badge', strat.badge_type]">{{ strat.badge_text }}</span>
            <span v-if="strat.type === 'strategy'" :class="['ver-badge', `ver-${strat.version ?? 'v1'}`]">{{ strat.version ?? 'v1' }}</span>
          </div>
          <div class="block">
            <div class="block-title">{{ strat.type === 'filter' ? '왜 이 필터?' : '왜 이 전략?' }}</div>
            <p>{{ strat.description }}</p>
          </div>
          <div class="block">
            <div class="block-title">{{ strat.type === 'gate' ? '동작 흐름' : strat.type === 'filter' ? '통과 조건' : '매수 · 매도 흐름' }}</div>
            <div class="flow">
              <div
                v-for="(step, i) in strat.flow"
                :key="i"
                class="flow-item"
              >
                <span :class="['tag', step.tag]">{{ step.label }}</span>{{ step.text }}
              </div>
            </div>
          </div>
          <div v-if="strat.type === 'strategy'" class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ scanCounts[strat.id] ?? 0 }}종목</div>
            </div>
          </div>
        </div>

      </div>
      </div><!-- /.carousel-wrap -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { fetchConfig, fetchScans, fetchStrategyStats, fetchVersionPerformance, fetchStrategies, fetchStrategyMeta } from '../api.js'

// 모든 레거시 전략이 strategies 테이블로 이동됨 — 하드코딩 불필요

const perfOpen = ref(false)
const cfg = ref(null)
const gridRef = ref(null)

function setupInfiniteCarousel() {
  const grid = gridRef.value
  if (!grid || window.innerWidth > 768) return

  const realCards = [...grid.children]
  const N = realCards.length
  if (N < 2) return

  const lastClone  = realCards[N - 1].cloneNode(true)
  const firstClone = realCards[0].cloneNode(true)
  grid.insertBefore(lastClone, realCards[0])
  grid.appendChild(firstClone)

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const GAP  = 8
    const PEEK = 16
    const cardW = grid.children[1].offsetWidth
    const step  = cardW + GAP

    let current = 1  // cloned 배열 기준 index (0=lastClone, 1=card1, ...)

    function setPos(idx, animate) {
      grid.style.transition = animate ? 'transform 0.32s ease' : 'none'
      grid.style.transform  = `translateX(${-(idx * step) + PEEK}px)`
    }

    setPos(current, false)

    // transitionend: 클론 위치에서 실제 카드로 순간이동 (애니메이션 없이)
    grid.addEventListener('transitionend', () => {
      if (current === 0) {
        current = N
        setPos(current, false)
      } else if (current === N + 1) {
        current = 1
        setPos(current, false)
      }
    })

    // 터치 스와이프
    const wrap = grid.parentElement
    let startX = 0
    let startTime = 0

    wrap.addEventListener('touchstart', e => {
      startX    = e.touches[0].clientX
      startTime = Date.now()
    }, { passive: true })

    wrap.addEventListener('touchend', e => {
      const dx  = e.changedTouches[0].clientX - startX
      const vel = Math.abs(dx) / (Date.now() - startTime)
      if (dx < -30 || vel > 0.4 && dx < 0) current++
      else if (dx > 30 || vel > 0.4 && dx > 0) current--
      setPos(current, true)
    }, { passive: true })
  }))
}

const versionPerf   = ref([])
const strategies    = ref([])    // 카드 렌더링용 (active only)
const strategyMeta  = ref([])    // 레이블·버전 맵용 (비활성 포함, type='strategy')
const scanCounts    = ref({})    // { strategy_id: count }
const lastScanDate  = ref('-')
const strategyStats = ref([])

// 성과 테이블용 레이블 맵 (DB type='strategy' 전체)
const strategyLabelMap = computed(() => {
  const map = {}
  strategyMeta.value.forEach(s => { map[s.id] = s.name })
  return map
})

// 전략 버전 맵 (DB type='strategy' 전체)
const strategyVersionMap = computed(() => {
  const map = {}
  strategyMeta.value.forEach(s => { map[s.id] = s.version ?? 'v1' })
  return map
})

function pnlClass(val) {
  if (val == null) return ''
  return val > 0 ? 'profit' : val < 0 ? 'loss' : ''
}

function formatPnl(val) {
  const sign = val >= 0 ? '+' : ''
  return sign + val.toLocaleString()
}

onMounted(async () => {
  const [config, scans, stats, verPerf, strats, meta] = await Promise.all([
    fetchConfig(),
    fetchScans(),
    fetchStrategyStats(),
    fetchVersionPerformance().catch(() => []),
    fetchStrategies().catch(() => []),
    fetchStrategyMeta().catch(() => []),
  ])
  cfg.value           = config
  strategyStats.value = stats
  versionPerf.value   = verPerf
  strategies.value    = strats
  strategyMeta.value  = meta

  if (scans.length) {
    const last = scans[0]
    const kst  = new Date(new Date(last.scanned_at).getTime() + 9 * 3600 * 1000)
    lastScanDate.value = kst.toISOString().slice(0, 10) + ' ' + kst.toISOString().slice(11, 16) + ' KST'

    // strategy 필드 기반 집계 (r.strategy 가 없으면 signal 텍스트로 폴백)
    const counts = {}
    last.results.forEach(r => {
      let sid = r.strategy
      if (!sid) {
        // 구형 스캔 레코드 폴백 — signal 텍스트 매칭
        const sig = r.signal ?? ''
        if      (sig.includes('눌림목'))                          sid = 'pullback'
        else if (sig.includes('조정구간'))                         sid = 'consolidation'
        else if (sig.includes('RSI+BB'))                          sid = 'rsi_bb_combo'
        else if (sig.includes('신고가') && !sig.includes('임박')) sid = 'breakout_52w'
        else if (sig.includes('골든크로스') && !sig.includes('임박')) sid = 'ma_cross'
        else if (sig.includes('골든크로스 임박'))                   sid = 'ma_cross_pending'
        else if (sig.includes('고가 임박'))                        sid = 'breakout_pending'
        else if (sig.includes('연속 양봉'))                        sid = 'volume_surge_pending'
      }
      if (sid) counts[sid] = (counts[sid] ?? 0) + 1
    })
    scanCounts.value = counts
  }

  await nextTick()
  setupInfiniteCarousel()  // 내부에서 rAF 2회 후 실행됨
})
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.caption { color: #888; font-size: 13px; margin-bottom: 24px; }
.strategy-layout { display: flex; flex-direction: column; gap: 20px; overflow-x: hidden; }

/* 버전 비교 */
.version-section { background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.version-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.current-tag { font-size: 11px; font-weight: 700; background: #1a1a2e; color: #fff; border-radius: 20px; padding: 2px 9px; }
.ver-cols { display: flex; gap: 12px; }
.ver-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.ver-top { display: flex; align-items: center; gap: 6px; }
.ver-badge { font-size: 11px; font-weight: 700; color: #888; background: #f0f0f0; border-radius: 20px; padding: 2px 8px; flex-shrink: 0; }
.ver-badge.ver-v1 { background: #f0f0f0; color: #888; }
.ver-badge.ver-v2 { background: #dbeafe; color: #1d4ed8; }
.ver-badge.ver-v3 { background: #d1fae5; color: #059669; }
.ver-badge.active { background: #1a1a2e !important; color: #fff !important; }
.ver-name { font-size: 12px; font-weight: 600; color: #555; }
.ver-empty { font-size: 12px; color: #bbb; padding: 4px 0; }
.ver-bar-wrap { display: flex; align-items: center; gap: 6px; }
.ver-bar-track { flex: 1; height: 6px; background: #f0f0f0; border-radius: 99px; overflow: hidden; }
.ver-bar-fill { height: 100%; border-radius: 99px; background: #aaa; transition: width .4s ease; }
.ver-bar-fill.profit { background: #dc2626; }
.ver-bar-fill.loss   { background: #1d4ed8; }
.ver-bar-label { font-size: 12px; font-weight: 700; min-width: 38px; text-align: right; }
.ver-sub { font-size: 11px; color: #888; }

@media (max-width: 768px) {
  .version-section { padding: 14px 16px; }
  .ver-cols { flex-direction: column; gap: 10px; }
  .ver-col:not(:last-child) { padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
}

/* 성과 테이블 */
.perf-section { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.perf-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 14px; user-select: none; }
.section-title { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.toggle-btn { font-size: 12px; color: #aaa; }
.perf-summary { display: flex; flex-direction: column; gap: 0; }
.perf-chip { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
.perf-chip:last-child { border-bottom: none; }
.chip-name { color: #555; font-weight: 600; }
.chip-stats { display: flex; gap: 6px; align-items: center; }
.chip-sep { color: #ddd; }
.chip-no-data { color: #ccc; }
.perf-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.perf-table th { text-align: left; color: #888; font-weight: 600; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
.perf-table td { padding: 10px 8px; border-bottom: 1px solid #f8f8f8; color: #333; }
.perf-table tr:last-child td { border-bottom: none; }
.profit { color: #dc2626; font-weight: 600; }
.loss   { color: #1d4ed8; font-weight: 600; }

@media (max-width: 768px) {
  .perf-section { padding: 16px; }
  .perf-table thead { display: none; }
  .perf-table tbody, .perf-table tr { display: block; }
  .perf-table tr {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .perf-table tr:last-child { border-bottom: none; }
  .perf-table td {
    padding: 3px 4px;
    border-bottom: none;
    font-size: 13px;
  }
  .perf-table td:first-child {
    grid-column: 1 / -1;
    font-weight: 700;
    font-size: 14px;
    color: #1a1a2e;
    padding-bottom: 6px;
  }
  .perf-table td::before {
    display: block;
    font-size: 11px;
    color: #aaa;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .perf-table td:nth-child(2)::before { content: '거래수'; }
  .perf-table td:nth-child(3)::before { content: '승률'; }
  .perf-table td:nth-child(4)::before { content: '평균수익률'; }
  .perf-table td:nth-child(5)::before { content: '총손익'; }
}

/* 전략 카드 그리드 (데스크탑) */
.strategy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.strategy-grid > .gate-card { grid-column: 1 / -1; }

@media (max-width: 768px) {
  h1 { font-size: 18px; margin-bottom: 4px; }
  .card { padding: 16px; }
  /* 모바일: transform 기반 캐러셀 */
  .carousel-wrap {
    overflow: hidden;
    touch-action: pan-y;
  }
  .strategy-grid {
    display: flex;
    gap: 8px;
    will-change: transform;
  }
  .strategy-grid .card {
    flex: 0 0 calc(100% - 32px);
    min-width: 0;
    max-width: calc(100% - 32px);
    overflow: hidden;
  }
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}
.badge.gate     { background: #fef3c7; color: #d97706; }
.badge.trend-up { background: #fee2e2; color: #dc2626; }
.badge.neutral  { background: #dbeafe; color: #1d4ed8; }
.badge.sideways { background: #ede9fe; color: #7c3aed; }
.badge.pullback { background: #ffedd5; color: #ea580c; }
.badge.pending  { background: #f3f4f6; color: #6b7280; }
.badge.chronos  { background: #a7f3d0; color: #065f46; }

.block {}
.block-title { font-size: 13px; font-weight: 700; color: #555; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
.block p { font-size: 14px; line-height: 1.6; color: #444; }

.flow { display: flex; flex-direction: column; gap: 8px; }
.flow-item { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; color: #333; }

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.tag.buy   { background: #fee2e2; color: #dc2626; }
.tag.sell  { background: #dbeafe; color: #1d4ed8; }
.tag.trail { background: #ede9fe; color: #7c3aed; }
.tag.loss  { background: #fef3c7; color: #d97706; }

.metric-row { margin-top: auto; padding-top: 16px; border-top: 1px solid #f0f0f0; }
.chronos-card { background: linear-gradient(160deg, #f0fdf4 0%, #fff 60%); border: 1.5px solid #bbf7d0; }
.card-amber  { background: linear-gradient(160deg, #fffbf0 0%, #fff 60%); border: 1.5px solid #fcd34d; }
.card-red    { background: linear-gradient(160deg, #fff5f5 0%, #fff 60%); border: 1.5px solid #fca5a5; }
.card-orange { background: linear-gradient(160deg, #fff7ed 0%, #fff 60%); border: 1.5px solid #fdba74; }
.card-purple { background: linear-gradient(160deg, #f5f3ff 0%, #fff 60%); border: 1.5px solid #c4b5fd; }
.card-teal   { background: linear-gradient(160deg, #f0fdfa 0%, #fff 60%); border: 1.5px solid #99f6e4; }
.metric .label { font-size: 13px; color: #888; margin-bottom: 4px; }
.metric .value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
</style>
