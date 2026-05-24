<template>
  <div>
    <h1>💼 포트폴리오 현황</h1>

    <div v-if="loading" class="empty">불러오는 중...</div>
    <template v-else>
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
          <div class="label">🇰🇷 국내 평가</div>
          <div class="value">{{ fmt(s.kr_eval) }}원</div>
        </div>
        <div class="metric">
          <div class="label">🇺🇸 해외 평가</div>
          <div class="value">{{ fmt(s.us_eval) }}원</div>
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
              <th>코드</th><th>종목명</th><th>수량</th>
              <th>평균단가</th><th>현재가</th><th>평가금액</th>
              <th>손익</th><th>수익률</th><th>최고수익</th>
              <th>매수일</th><th>전략</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in krPositions" :key="p.code">
              <td>{{ p.code }}</td>
              <td>{{ p.name }}</td>
              <td>{{ p.shares }}</td>
              <td>{{ fmt(p.avg_price) }}</td>
              <td>{{ fmt(p.current_price) }}</td>
              <td>{{ fmt(p.eval_amount) }}</td>
              <td :class="p.pnl >= 0 ? 'pos' : 'neg'">{{ p.pnl >= 0 ? '+' : '' }}{{ fmt(p.pnl) }}</td>
              <td :class="p.pnl_pct >= 0 ? 'pos' : 'neg'">{{ p.pnl_pct >= 0 ? '+' : '' }}{{ p.pnl_pct.toFixed(2) }}%</td>
              <td class="peak">{{ p.peak_pnl_pct > 0 ? p.peak_pnl_pct.toFixed(1) + '%' : '-' }}</td>
              <td>{{ p.buy_date }}</td>
              <td>{{ fmtStrategy(p.strategy) }}</td>
            </tr>
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
        <table v-else>
          <thead>
            <tr>
              <th>코드</th><th>종목명</th><th>수량</th>
              <th>평균단가(USD)</th><th>현재가(USD)</th><th>평가금액</th>
              <th>손익</th><th>수익률</th><th>최고수익</th>
              <th>매수일</th><th>전략</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in usPositions" :key="p.code">
              <td>{{ p.code }}</td>
              <td>{{ p.name }}</td>
              <td>{{ p.shares }}</td>
              <td>${{ fmtUsd(p.avg_price) }}</td>
              <td>${{ fmtUsd(p.current_price) }}</td>
              <td>{{ fmt(p.eval_amount) }}원</td>
              <td :class="p.pnl >= 0 ? 'pos' : 'neg'">{{ p.pnl >= 0 ? '+' : '' }}{{ fmt(p.pnl) }}</td>
              <td :class="p.pnl_pct >= 0 ? 'pos' : 'neg'">{{ p.pnl_pct >= 0 ? '+' : '' }}{{ p.pnl_pct.toFixed(2) }}%</td>
              <td class="peak">{{ p.peak_pnl_pct > 0 ? p.peak_pnl_pct.toFixed(1) + '%' : '-' }}</td>
              <td>{{ p.buy_date }}</td>
              <td>{{ fmtStrategy(p.strategy) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchPortfolio } from '../api.js'

const loading = ref(true)
const s = ref({ total_asset: 0, total_pnl: 0, total_pnl_pct: 0, total_eval: 0, kr_eval: 0, us_eval: 0, cash: 0, usd_rate: null })
const positions = ref([])
let timer

const krPositions = computed(() => positions.value.filter(p => p.market !== 'US'))
const usPositions = computed(() => positions.value.filter(p => p.market === 'US'))

const labels = { ma_cross: 'MA크로스', rsi_reversal: 'RSI역발산', bb_reversal: 'BB반등', breakout_52w: '52주신고가' }
const fmtStrategy = v => (Array.isArray(v) ? v : [v]).map(x => labels[x] || x).join('+')
const fmt = n => {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const str = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rounded < 0 ? '-' + str : str
}
const fmtUsd = n => (n == null ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

async function load() {
  try {
    const data = await fetchPortfolio()
    s.value = data.summary
    positions.value = data.positions
  } finally {
    loading.value = false
  }
}

onMounted(() => { load(); timer = setInterval(load, 30000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 24px; }
h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.exchange-rate { font-size: 12px; font-weight: 400; color: #888; background: #f3f4f6; padding: 2px 8px; border-radius: 10px; }

.metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
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
.metric .sub { font-size: 13px; margin-top: 4px; }

.section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow-x: auto; }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
td { padding: 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
tr:last-child td { border-bottom: none; }

.pos { color: #e74c3c; }
.neg { color: #2563eb; }
.peak { color: #7c3aed; }
.empty { color: #aaa; padding: 16px 0; }

@media (max-width: 768px) {
  .metrics { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
  h2 { font-size: 15px; }
  .metric { padding: 14px; }
  .metric .value { font-size: 18px; }
  .section { padding: 12px; overflow-x: visible; }
  h1 { font-size: 18px; margin-bottom: 16px; }

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
  td::before {
    color: #888;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    margin-right: 8px;
  }
  td:nth-child(1)::before { content: '코드'; }
  td:nth-child(2)::before { content: '종목명'; }
  td:nth-child(3)::before { content: '수량'; }
  td:nth-child(4)::before { content: '평균단가'; }
  td:nth-child(5)::before { content: '현재가'; }
  td:nth-child(6)::before { content: '평가금액'; }
  td:nth-child(7)::before { content: '손익'; }
  td:nth-child(8)::before { content: '수익률'; }
  td:nth-child(9)::before { content: '최고수익'; }
  td:nth-child(10)::before { content: '매수일'; }
  td:nth-child(11)::before { content: '전략'; }
}
</style>
