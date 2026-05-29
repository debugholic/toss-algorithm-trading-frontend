<template>
  <div>
    <div class="page-header">
      <h1>포트폴리오 현황</h1>
      <RouterLink to="/report" class="report-btn">주간 리포트</RouterLink>
    </div>

    <div v-if="loading" class="empty">불러오는 중...</div>
    <template v-else>
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
import { fetchPortfolio, fetchSnapshotHistory } from '../api.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const loading = ref(true)
const s = ref({ total_asset: 0, total_pnl: 0, total_pnl_pct: 0, total_eval: 0, kr_eval: 0, us_eval: 0, cash: 0, usd_rate: null })
const positions = ref([])
const chartData = ref(null)
const expandedRows = ref(new Set())
let timer

function toggle(code) {
  const next = new Set(expandedRows.value)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  expandedRows.value = next
}
function isExpanded(code) {
  return expandedRows.value.has(code)
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
  ma_cross:              'MA크로스',
  rsi_reversal:          'RSI역발산',
  bb_reversal:           'BB반등',
  breakout_52w:          '52주 신고가',
  rsi_bb_combo:          'RSI+BB복합',
  pullback:              '눌림목',
  consolidation:         '조정구간',
  ma_cross_pending:      '골든크로스 임박',
  breakout_pending:      '52주 고가 임박',
  volume_surge_pending:  '거래량증가 임박',
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
  try {
    const [data, history] = await Promise.all([fetchPortfolio(), fetchSnapshotHistory()])
    s.value = data.summary
    positions.value = data.positions

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
