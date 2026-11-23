<template>
  <div>
    <div class="page-header">
      <div>
        <h1>포트폴리오 현황</h1>
        <div class="meta-line">
          <span v-if="snapshotAt" :class="{ 'stale-text': snapshotAgeMin > 60 }">
            {{ fmtKst(snapshotAt) }} 기준 · {{ fmtAge(snapshotAgeMin) }}
          </span>
          <span v-if="botVersion"> · 봇 버전 {{ botVersion }}</span>
        </div>
      </div>
      <RouterLink to="/report" class="report-btn">주간 리포트</RouterLink>
    </div>

    <div v-if="loadError" class="dead-banner">
      ⚠️ 데이터를 불러오지 못했습니다
      <span class="dead-sub">{{ loadError }}{{ hasData ? ' — 아래는 마지막으로 불러온 값입니다' : '' }}</span>
    </div>

    <div v-if="configError" class="warn-banner">⚠️ 트레이더 상태(하트비트·진단)를 불러오지 못했습니다 — 응답 없음 여부를 확인할 수 없습니다</div>

    <!-- 매매 본문이 계속 실패 중 (루프는 살아 있어도 손절·매수가 안 도는 상태) -->
    <div v-for="f in loopFailures" :key="f.flag" class="dead-banner">
      ⚠️ {{ f.flag }} 매매 루프 오류 — {{ fmtKst(f.at) }}
      <span class="dead-sub">{{ f.error }}</span>
    </div>

    <!-- 트레이더 루프 무응답 경고 -->
    <div v-if="staleLoops.length" class="dead-banner">
      ⚠️ 트레이더 응답 없음 —
      <span v-for="(l, i) in staleLoops" :key="l.flag">{{ i > 0 ? ' · ' : '' }}{{ l.flag }} {{ l.min == null ? '하트비트 기록 없음' : l.min + '분째 무신호' }}</span>
      <span class="dead-sub">서버(NAS) 컨테이너 상태를 확인하세요</span>
    </div>

    <!-- Claude 장 마감 감시 리포트 -->
    <div v-for="m in aiMonitors" :key="m.kind" class="ai-card" :class="'ai-' + m.status">
      <button class="ai-head" @click="toggleAi(m.kind)">
        <span>{{ AI_ICON[m.status] || '🤖' }} {{ m.kind === 'monitor_us' ? '🇺🇸' : '🇰🇷' }} 감시 리포트 ·
          <b>{{ m.data.result?.headline || (m.status === 'error' ? 'AI 분석 실패' : '코드 점검 결과') }}</b></span>
        <span class="ai-at">{{ fmtKst(m.created_at) }} {{ aiOpen[m.kind] ? '▲' : '▼' }}</span>
      </button>
      <div v-if="aiOpen[m.kind]" class="ai-body">
        <ul>
          <li v-for="(a, i) in m.data.hard_alarms || []" :key="'h' + i" class="sev-critical">{{ a }}</li>
          <li v-for="(f, i) in m.data.result?.findings || []" :key="i" :class="'sev-' + f.severity">
            <b>{{ f.title }}</b> — {{ f.detail }}
          </li>
        </ul>
        <p v-if="m.data.result?.summary" class="ai-summary">{{ m.data.result.summary }}</p>
        <p v-if="m.data.error" class="ai-summary">오류: {{ m.data.error }}</p>
      </div>
    </div>

    <!-- 듀얼 모멘텀 게이트 현황 -->
    <div v-if="regime" class="gate-banner" :class="gateClass">
      <div class="gate-main">
        <span class="gate-icon">{{ gateIcon }}</span>
        <span class="gate-title">{{ gateTitle }}</span>
      </div>
      <div v-if="gateState === 'unknown'" class="gate-reasons-text">{{ regime.desc || '판정 정보 없음' }}</div>
      <div v-else class="gate-markets">
        <span class="gate-chip" :class="regime.kr_buyable ? 'ok' : 'block'">
          🇰🇷 {{ regime.kr_buyable ? `매수 활성 ${regime.kr_ratio}%` : '매수 차단' }}
        </span>
        <span class="gate-chip" :class="regime.us_buyable ? 'ok' : 'block'">
          🇺🇸 {{ regime.us_buyable ? `매수 활성 ${regime.us_ratio}%` : '매수 차단' }}
        </span>
        <span class="gate-chip cash">💵 현금 {{ regime.cash_ratio }}%</span>
      </div>
      <ul v-if="blockReasons.length" class="gate-reasons">
        <li v-for="(r, i) in blockReasons" :key="i">{{ r }}</li>
      </ul>
    </div>

    <div v-if="loading" class="empty">불러오는 중...</div>
    <template v-else-if="hasData">
      <!-- 수익률 추이 차트 -->
      <div class="section chart-section" v-if="chartData">
        <h2>수익률 추이</h2>
        <div class="chart-wrap">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- 요약 메트릭 -->
      <div class="metrics">
        <div class="metric">
          <div class="label">총 자산</div>
          <div class="value">{{ fmt(s.total_asset) }}원</div>
          <div class="sub" :class="s.total_pnl >= 0 ? 'pos' : 'neg'">
            {{ s.total_pnl >= 0 ? '+' : '' }}{{ fmt(s.total_pnl) }}원
          </div>
        </div>
        <div class="metric">
          <div class="label">수익률</div>
          <div class="value" :class="s.total_pnl_pct >= 0 ? 'pos' : 'neg'">
            {{ s.total_pnl_pct >= 0 ? '+' : '' }}{{ s.total_pnl_pct.toFixed(2) }}%
          </div>
        </div>
        <div class="metric">
          <div class="label">평가금액</div>
          <div class="value">{{ fmt(s.total_eval) }}원</div>
          <div class="sub-row">
            <span class="sub">🇰🇷 {{ fmt(s.kr_eval) }}</span>
            <span class="sub">🇺🇸 {{ fmt(s.us_eval) }}</span>
          </div>
        </div>
        <div class="metric">
          <div class="label">현금</div>
          <div class="value">{{ fmt(s.cash) }}원</div>
        </div>
      </div>

      <!-- 국내 주식 섹션 -->
      <div class="section">
        <h2>🇰🇷 국내 주식</h2>
        <div v-if="!krPositions.length" class="empty">보유 종목 없음</div>
        <table v-else>
          <thead>
            <tr>
              <th>종목명</th><th>손익</th><th>평가금액</th><th>수익률</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in krPositions" :key="p.code">
              <tr class="summary-row" :class="{ expanded: isExpanded(p.code) }" @click="toggle(p.code)">
                <td class="name-col">{{ p.name }}</td>
                <td :class="p.pnl >= 0 ? 'pos' : 'neg'">{{ p.pnl >= 0 ? '+' : '' }}{{ fmt(p.pnl) }}</td>
                <td>{{ fmt(p.eval_amount) }}</td>
                <td :class="p.pnl_pct >= 0 ? 'pos' : 'neg'">{{ p.pnl_pct >= 0 ? '+' : '' }}{{ p.pnl_pct.toFixed(2) }}%</td>
              </tr>
              <tr v-if="isExpanded(p.code)" class="detail-row">
                <td colspan="4">
                  <div class="detail-grid">
                    <div class="detail-item"><span class="dl">수량</span>{{ p.shares }}</div>
                    <div class="detail-item"><span class="dl">평균단가</span>{{ fmt(p.avg_price) }}</div>
                    <div class="detail-item"><span class="dl">현재가</span>{{ fmt(p.current_price) }}</div>
                    <div class="detail-item"><span class="dl">최고수익</span><span class="peak">{{ p.peak_pnl_pct > 0 ? p.peak_pnl_pct.toFixed(1) + '%' : '-' }}</span></div>
                    <div class="detail-item"><span class="dl">매수일</span>{{ p.buy_date }}</div>
                    <div class="detail-item"><span class="dl">전략</span>{{ fmtStrategy(p.strategy) }}</div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- 해외 주식 섹션 -->
      <div class="section">
        <h2>
          🇺🇸 해외 주식
          <span v-if="s.usd_rate" class="exchange-rate">USD/KRW {{ s.usd_rate.toLocaleString() }}원</span>
        </h2>
        <div v-if="!usPositions.length" class="empty">보유 종목 없음</div>
        <table v-else class="us-table">
          <thead>
            <tr>
              <th>종목명</th><th>손익</th><th>평가금액</th><th>수익률</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in usPositions" :key="p.code">
              <tr class="summary-row" :class="{ expanded: isExpanded(p.code) }" @click="toggle(p.code)">
                <td class="name-col">{{ p.name }}</td>
                <td :class="p.pnl >= 0 ? 'pos' : 'neg'">{{ p.pnl >= 0 ? '+' : '' }}{{ fmt(p.pnl) }}</td>
                <td>{{ fmt(p.eval_amount) }}원</td>
                <td :class="p.pnl_pct >= 0 ? 'pos' : 'neg'">{{ p.pnl_pct >= 0 ? '+' : '' }}{{ p.pnl_pct.toFixed(2) }}%</td>
              </tr>
              <tr v-if="isExpanded(p.code)" class="detail-row">
                <td colspan="4">
                  <div class="detail-grid">
                    <div class="detail-item"><span class="dl">수량</span>{{ p.shares }}</div>
                    <div class="detail-item"><span class="dl">평균단가</span>${{ fmtUsd(p.avg_price) }}</div>
                    <div class="detail-item"><span class="dl">현재가</span>${{ fmtUsd(p.current_price) }}</div>
                    <div class="detail-item"><span class="dl">최고수익</span><span class="peak">{{ p.peak_pnl_pct > 0 ? p.peak_pnl_pct.toFixed(1) + '%' : '-' }}</span></div>
                    <div class="detail-item"><span class="dl">매수일</span>{{ p.buy_date }}</div>
                    <div class="detail-item"><span class="dl">전략</span>{{ fmtStrategy(p.strategy) }}</div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- 원격 진단에 쌓인 최근 경고·오류 -->
      <div v-if="diagErrors.length" class="section">
        <button class="diag-toggle" @click="diagOpen = !diagOpen">
          <h2>최근 경고·오류 {{ diagErrors.length }}건 <span class="diag-at">진단 {{ fmtKst(diagAt) }}</span></h2>
          <span>{{ diagOpen ? '▲' : '▼' }}</span>
        </button>
        <ul v-if="diagOpen" class="diag-list">
          <li v-for="(e, i) in diagErrors" :key="i" :class="e.level === 'WARNING' ? 'warn' : 'err'">
            <span class="diag-time">{{ e.at }}</span> [{{ e.level }}] {{ e.msg }}
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler
} from 'chart.js'
import { fetchPortfolio, fetchSnapshotHistory, fetchConfig, fetchAiMonitors } from '../api.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const loading = ref(true)
const hasData = ref(false)
const loadError = ref('')
const configError = ref(false)
const snapshotAt = ref(null)
const cfgData = ref(null)
const diagOpen = ref(false)
const now = ref(Date.now())
const aiReports = ref({})
const aiOpen = ref({})
const AI_ICON = { ok: '✅', warn: '⚠️', critical: '🚨', error: '❔' }
// 하루 넘게 지난 리포트는 숨김 — 오래된 경고가 현재 상태처럼 보이지 않게
const aiMonitors = computed(() => Object.values(aiReports.value)
  .filter(m => now.value - new Date(m.created_at).getTime() < 36 * 3600 * 1000))
function toggleAi(kind) { aiOpen.value = { ...aiOpen.value, [kind]: !aiOpen.value[kind] } }
const s = ref({ total_asset: 0, total_pnl: 0, total_pnl_pct: 0, total_eval: 0, kr_eval: 0, us_eval: 0, cash: 0, usd_rate: null })
const regime = ref(null)
const heartbeats = ref(null)
const positions = ref([])
const chartData = ref(null)
const expandedRows = ref(new Set())
let timer

// 트레이더 루프 생존 감시 — config.data.heartbeat_kr/us ({at, ttl_min}) 기준
// ttl_min 경과 시 무응답으로 판정 (스캔 중에는 백엔드가 ttl 90분으로 기록해 오탐 방지)
const staleLoops = computed(() => {
  if (!heartbeats.value) return []
  const out = []
  for (const [key, flag] of [['kr', '🇰🇷'], ['us', '🇺🇸']]) {
    const hb = heartbeats.value[key]
    if (!hb?.at) { out.push({ flag, min: null }); continue }
    const ttlMin = hb.ttl_min ?? 60
    const elapsedMin = Math.floor((now.value - new Date(hb.at).getTime()) / 60000)
    if (elapsedMin > ttlMin) out.push({ flag, min: elapsedMin })
  }
  return out
})

// 듀얼 모멘텀 게이트: none=정상 / partial=일부 차단 / all=전면 관망
const gateState = computed(() => {
  if (!regime.value) return null
  // 판정 실패({error}) 나 필드 누락을 '차단' 으로 읽으면 거짓 '전면 관망' 경고가 뜬다
  if (regime.value.error || regime.value.kr_buyable === undefined) return 'unknown'
  const { kr_buyable, us_buyable } = regime.value
  if (!kr_buyable && !us_buyable) return 'all'
  if (!kr_buyable || !us_buyable) return 'partial'
  return 'none'
})
const gateClass = computed(() => ({
  'gate-danger': gateState.value === 'all',
  'gate-warn':   gateState.value === 'partial',
  'gate-ok':     gateState.value === 'none',
  'gate-warn-unknown': gateState.value === 'unknown',
}))
const gateIcon = computed(() => ({ all: '🛑', partial: '⚠️', none: '✅', unknown: '❔' }[gateState.value] ?? ''))
const gateTitle = computed(() => ({
  unknown: '듀얼 모멘텀: 판정 실패 — 매수 가능 여부를 알 수 없음',
  all:     '듀얼 모멘텀: 전면 관망 — 양 시장 매수 차단',
  partial: '듀얼 모멘텀: 일부 시장 매수 차단',
  none:    '듀얼 모멘텀: 매수 활성',
}[gateState.value] ?? ''))
const blockReasons = computed(() => {
  if (!regime.value || gateState.value === 'unknown') return []
  const r = []
  if (!regime.value.kr_buyable) {
    r.push('🇰🇷 ' + (!regime.value.kr_abs_momentum ? 'KOSPI 1년 수익률 음수 — 절대 모멘텀 차단' : '국면 약세로 배분 0%'))
  }
  if (!regime.value.us_buyable) {
    r.push('🇺🇸 ' + (!regime.value.us_abs_momentum ? 'QQQ 1년 수익률 음수 — 절대 모멘텀 차단' : '국면 약세로 배분 0%'))
  }
  return r
})

function toggle(code) {
  const next = new Set(expandedRows.value)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  expandedRows.value = next
}
function isExpanded(code) {
  return expandedRows.value.has(code)
}

const snapshotAgeMin = computed(() =>
  snapshotAt.value ? Math.floor((now.value - new Date(snapshotAt.value).getTime()) / 60000) : null)
const botVersion = computed(() => {
  const c = cfgData.value
  return c?.heartbeat_kr?.version || c?.heartbeat_us?.version || c?.diag?.version || null
})
const diagErrors = computed(() => [...(cfgData.value?.diag?.errors ?? [])].reverse())
const diagAt = computed(() => cfgData.value?.diag?.at)
// 마지막 오류가 마지막 성공보다 나중이면 지금 매매 본문이 실패 중
const loopFailures = computed(() => {
  const c = cfgData.value
  if (!c) return []
  const out = []
  for (const [key, flag] of [['kr', '🇰🇷'], ['us', '🇺🇸']]) {
    const hb = c[`heartbeat_${key}`]
    if (hb?.error_at && (!hb.ok_at || new Date(hb.error_at) > new Date(hb.ok_at))) {
      out.push({ flag, at: hb.error_at, error: hb.error })
    }
  }
  return out
})

function fmtKst(ts) {
  if (!ts) return '-'
  const k = new Date(new Date(ts).getTime() + 9 * 3600 * 1000).toISOString()
  return `${k.slice(5, 10)} ${k.slice(11, 16)}`
}
function fmtAge(min) {
  if (min == null) return ''
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`
  return `${Math.floor(min / 1440)}일 전`
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { display: false }, tooltip: {
    callbacks: {
      label: ctx => `  ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`
    }
  }},
  scales: {
    x: { display: false },
    y: {
      grace: '10%',
      grid: { color: '#f0f0f0' },
      ticks: { font: { size: 11 }, color: '#aaa', callback: v => `${v >= 0 ? '+' : ''}${v}%` },
      border: { display: false },
    }
  }
}

const krPositions = computed(() => positions.value.filter(p => p.market !== 'US'))
const usPositions = computed(() => positions.value.filter(p => p.market === 'US'))

const labels = {
  breakout_52w:          '52주 신고가',
  rsi_bb_combo:          'RSI+BB복합',
  pullback:              '눌림목',
  consolidation:         '조정구간',
  ma_cross_pending:      '골든크로스 임박',
  breakout_pending:      '52주 고가 임박',
  volume_surge_pending:  '거래량증가 임박',
  buyback:               '자사주 공시',
}
const fmtStrategy = v => {
  if (!v) return '-'
  let arr
  if (Array.isArray(v)) {
    arr = v
  } else if (typeof v === 'string') {
    try { arr = JSON.parse(v) } catch { arr = [v] }
    if (!Array.isArray(arr)) arr = [arr]
  } else {
    arr = [v]
  }
  return arr.map(x => labels[x] || x).join('+')
}
const fmt = n => {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const str = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rounded < 0 ? '-' + str : str
}
const fmtUsd = n => (n == null ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

async function load() {
  now.value = Date.now()
  try {
    const [data, history, cfg] = await Promise.all([
      fetchPortfolio(),
      fetchSnapshotHistory(),
      fetchConfig().catch(() => null),
    ])
    aiReports.value = await fetchAiMonitors().catch(() => aiReports.value)
    s.value = data.summary
    regime.value = data.regime
    snapshotAt.value = data.snapshotted_at
    configError.value = !cfg
    cfgData.value = cfg
    heartbeats.value = cfg ? { kr: cfg.heartbeat_kr, us: cfg.heartbeat_us } : null
    positions.value = data.positions
    hasData.value = true
    loadError.value = ''

    if (history.length > 1) {
      const isProfit = history[history.length - 1].pnl_pct >= 0
      const color = isProfit ? '#dc2626' : '#2563eb'
      chartData.value = {
        labels: history.map(h => h.date),
        datasets: [{
          data: history.map(h => h.pnl_pct),
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          backgroundColor: ctx => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
            gradient.addColorStop(0, isProfit ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.15)')
            gradient.addColorStop(1, 'rgba(255,255,255,0)')
            return gradient
          },
          tension: 0.3,
        }]
      }
    }
  } catch (e) {
    loadError.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { load(); timer = setInterval(load, 30000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
h1 { font-size: 22px; font-weight: 700; }
.report-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #2563eb;
  color: #fff !important;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
  flex-shrink: 0;
}
.report-btn:hover { background: #1d4ed8; }
h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.exchange-rate { font-size: 12px; font-weight: 400; color: #888; background: #f3f4f6; padding: 2px 8px; border-radius: 10px; }

/* Claude 감시 리포트 */
.ai-card { border-radius: 12px; margin-bottom: 12px; border: 1.5px solid #e5e7eb; background: #fff; }
.ai-card.ai-ok { border-color: #bbf7d0; background: #f0fdf4; }
.ai-card.ai-warn { border-color: #fde68a; background: #fffbeb; }
.ai-card.ai-critical { border-color: #fca5a5; background: #fef2f2; }
.ai-head { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 16px; background: none; border: none; cursor: pointer; font-size: 13px; color: #374151; text-align: left; }
.ai-at { font-size: 12px; color: #888; flex-shrink: 0; }
.ai-body { padding: 0 16px 12px; font-size: 13px; }
.ai-body ul { margin: 0; padding-left: 18px; }
.ai-body li { line-height: 1.7; }
.sev-critical { color: #b91c1c; }
.sev-warn { color: #b45309; }
.sev-info { color: #4b5563; }
.ai-summary { margin: 8px 0 0; color: #4b5563; }

/* 트레이더 무응답 경고 배너 */
.dead-banner {
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 20px;
  border: 1.5px solid #fca5a5;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 700;
}
.dead-sub { display: block; margin-top: 4px; font-size: 12px; font-weight: 500; color: #ef4444; }

/* 듀얼 모멘텀 게이트 배너 */
.gate-banner {
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  border: 1.5px solid;
}
.gate-banner.gate-ok     { background: #f0fdf4; border-color: #bbf7d0; }
.gate-banner.gate-warn   { background: #fffbeb; border-color: #fde68a; }
.gate-banner.gate-danger { background: #fef2f2; border-color: #fecaca; }
.gate-banner.gate-warn-unknown { background: #f9fafb; border-color: #d1d5db; }
.gate-reasons-text { margin-top: 8px; font-size: 12px; color: #6b7280; }
.meta-line { font-size: 12px; color: #888; margin-top: 4px; }
.stale-text { color: #b45309; font-weight: 600; }
.warn-banner { border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; border: 1.5px solid #fde68a; background: #fffbeb; color: #b45309; font-size: 13px; font-weight: 600; }
.diag-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; background: none; border: none; padding: 0; cursor: pointer; color: inherit; }
.diag-toggle h2 { margin-bottom: 0; }
.diag-at { font-size: 12px; font-weight: 400; color: #888; }
.diag-list { margin: 12px 0 0; padding: 0; list-style: none; font-size: 12px; font-family: ui-monospace, monospace; }
.diag-list li { padding: 6px 0; border-bottom: 1px solid #f0f0f0; white-space: normal; word-break: break-all; }
.diag-list li.warn { color: #b45309; }
.diag-list li.err { color: #b91c1c; }
.diag-time { color: #999; }
.gate-main { display: flex; align-items: center; gap: 8px; }
.gate-icon { font-size: 18px; }
.gate-title { font-size: 15px; font-weight: 700; }
.gate-ok     .gate-title { color: #15803d; }
.gate-warn   .gate-title { color: #b45309; }
.gate-danger .gate-title { color: #b91c1c; }
.gate-markets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.gate-chip {
  font-size: 12px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px;
  background: #f3f4f6; color: #4b5563;
}
.gate-chip.ok    { background: #dcfce7; color: #15803d; }
.gate-chip.block { background: #fee2e2; color: #b91c1c; }
.gate-chip.cash  { background: #eef2ff; color: #4338ca; }
.gate-reasons { margin: 12px 0 0; padding-left: 18px; }
.gate-reasons li { font-size: 12px; color: #6b7280; line-height: 1.7; }

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.metric {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.metric .label { font-size: 13px; color: #666; margin-bottom: 6px; }
.metric .value { font-size: 22px; font-weight: 700; }
.metric .sub { font-size: 12px; margin-top: 4px; color: #888; }
.sub-row { display: flex; gap: 2px 6px; margin-top: 4px; flex-wrap: wrap; }
.sub-row .sub { margin-top: 0; }

.section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow-x: auto; margin-bottom: 20px; }
.chart-section { overflow: hidden; }
.chart-wrap { height: 220px; }

@media (max-width: 768px) { .chart-wrap { height: 160px; } }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
td { padding: 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }

.pos { color: #e74c3c; }
.neg { color: #2563eb; }
.peak { color: #7c3aed; }
.empty { color: #aaa; padding: 16px 0; }

.summary-row { cursor: pointer; }
.summary-row:hover { background: #fafafa; }
.summary-row.expanded td { border-color: #2563eb; }
.name-col { font-weight: 500; }

.detail-row td { background: #f8f9ff; padding: 12px 16px; border-bottom-color: #2563eb; }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px 16px;
}
.detail-item { font-size: 12px; display: flex; flex-direction: column; gap: 2px; }
.dl { color: #999; font-size: 11px; }

@media (max-width: 768px) {
  .metrics { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
  .metric .value { font-size: 18px; }
  h2 { font-size: 15px; }
  .metric { padding: 14px; }
  .section { padding: 16px; overflow-x: visible; margin-bottom: 16px; }
  h1 { font-size: 18px; }
  .page-header { margin-bottom: 16px; }
  .report-btn { padding: 7px 12px; font-size: 12px; }

  table, thead, tbody, tr { display: block; }
  thead { display: none; }
  tr {
    background: #f9f9fb;
    border-radius: 10px;
    margin-bottom: 10px;
    border: 1px solid #eee;
  }
  td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid #f0f0f0 !important;
    white-space: normal;
    font-size: 13px;
  }
  tr td:last-child { border-bottom: none !important; }
  /* 요약 행 — 라벨 없음 (헤더 숨김 대신 순서로 파악) */
  .summary-row td:nth-child(1)::before { content: '종목명'; color: #888; font-size: 12px; font-weight: 600; flex-shrink: 0; margin-right: 8px; }
  .summary-row td:nth-child(2)::before { content: '손익'; color: #888; font-size: 12px; font-weight: 600; flex-shrink: 0; margin-right: 8px; }
  .summary-row td:nth-child(3)::before { content: '평가금액'; color: #888; font-size: 12px; font-weight: 600; flex-shrink: 0; margin-right: 8px; }
  .summary-row td:nth-child(4)::before { content: '수익률'; color: #888; font-size: 12px; font-weight: 600; flex-shrink: 0; margin-right: 8px; }

  /* 상세 행 — 그리드 레이아웃으로 전환 */
  .detail-row td { display: block !important; }
  .detail-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
