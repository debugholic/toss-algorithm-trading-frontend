<template>
  <div>
    <!-- 헤더 -->
    <div class="page-header">
      <div>
        <h1>주간 리포트</h1>
        <div v-if="report" class="gen-time">생성: {{ fmtDatetime(report.generated_at) }}</div>
      </div>
      <RouterLink to="/" class="back-btn">← 포트폴리오</RouterLink>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-icon">⏳</div>
      <div class="empty-title">불러오는 중...</div>
    </div>

    <div v-else-if="!report" class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">아직 리포트가 없습니다</div>
      <div class="empty-desc">매주 일요일 밤 22시에 자동으로 생성됩니다</div>
    </div>

    <template v-else>
      <!-- 기간 배너 -->
      <div class="period-bar">
        <span class="period-text">📅 {{ rd.period }}</span>
      </div>

      <!-- 포트폴리오 요약 메트릭 -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="mc-label">총 자산</div>
          <div class="mc-value">{{ fmt(rd.summary?.total_asset) }}원</div>
        </div>
        <div class="metric-card">
          <div class="mc-label">누적 수익률</div>
          <div class="mc-value" :class="numClass(rd.summary?.total_pnl_pct)">
            {{ fmtPct(rd.summary?.total_pnl_pct) }}
          </div>
        </div>
        <div class="metric-card">
          <div class="mc-label">현금</div>
          <div class="mc-value">{{ fmt(rd.summary?.cash) }}원</div>
        </div>
        <div class="metric-card">
          <div class="mc-label">보유 종목</div>
          <div class="mc-value">{{ rd.summary?.open_positions ?? 0 }}개</div>
        </div>
      </div>

      <!-- 이번 주 거래 + 하이라이트 -->
      <div class="two-col">
        <div class="section">
          <h2>이번 주 거래</h2>
          <div class="stat-list">
            <div class="stat-row">
              <span class="sl">매수</span>
              <span>{{ rw.buy_count ?? 0 }}건</span>
            </div>
            <div class="stat-row">
              <span class="sl">매도 / 손절</span>
              <span>{{ rw.sell_count ?? 0 }}건</span>
            </div>
            <div class="stat-row">
              <span class="sl">승 / 패</span>
              <span>
                <span class="pos">{{ rw.win_count ?? 0 }}승</span>
                &nbsp;/&nbsp;
                <span class="neg">{{ rw.loss_count ?? 0 }}패</span>
              </span>
            </div>
            <div class="stat-row">
              <span class="sl">승률</span>
              <span :class="(rw.sell_count ?? 0) > 0 ? numClass(rw.win_rate, 50) : ''">
                {{ (rw.sell_count ?? 0) > 0 ? (rw.win_rate ?? 0).toFixed(1) + '%' : '-' }}
              </span>
            </div>
            <div class="stat-row stat-highlight">
              <span class="sl">실현 손익</span>
              <span :class="numClass(rw.realized_pnl)">
                {{ (rw.realized_pnl ?? 0) >= 0 ? '+' : '' }}{{ fmt(rw.realized_pnl ?? 0) }}원
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>주간 하이라이트</h2>
          <div v-if="rw.best_trade?.ticker" class="highlight best">
            <div class="hl-badge">🏆 베스트</div>
            <div class="hl-body">
              <span class="hl-ticker">{{ rw.best_trade.name || rw.best_trade.ticker }}</span>
              <span class="hl-strat">{{ fmtStrategy(rw.best_trade.strategy) }}</span>
            </div>
            <div class="hl-nums">
              <span class="pos bold">+{{ (rw.best_trade.pnl_pct ?? 0).toFixed(2) }}%</span>
              <span class="pos hl-sub">+{{ fmt(rw.best_trade.pnl ?? 0) }}원</span>
            </div>
          </div>
          <div v-if="rw.worst_trade?.ticker" class="highlight worst">
            <div class="hl-badge">📉 워스트</div>
            <div class="hl-body">
              <span class="hl-ticker">{{ rw.worst_trade.name || rw.worst_trade.ticker }}</span>
              <span class="hl-strat">{{ fmtStrategy(rw.worst_trade.strategy) }}</span>
            </div>
            <div class="hl-nums">
              <span class="neg bold">{{ (rw.worst_trade.pnl_pct ?? 0).toFixed(2) }}%</span>
              <span class="neg hl-sub">{{ fmt(rw.worst_trade.pnl ?? 0) }}원</span>
            </div>
          </div>
          <div v-if="!rw.best_trade?.ticker && !rw.worst_trade?.ticker" class="empty-inline">
            이번 주 청산 거래 없음
          </div>
        </div>
      </div>

      <!-- 전략별 성과 -->
      <div class="section" v-if="hasStrategies">
        <h2>전략별 성과</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>전략</th><th>거래</th><th>승</th><th>패</th><th>승률</th><th>실현 손익</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sv, sid) in rd.by_strategy" :key="sid">
                <td class="strat-name">{{ stratLabel(sid) }}</td>
                <td>{{ sv.trades ?? 0 }}</td>
                <td class="pos">{{ sv.wins ?? 0 }}</td>
                <td class="neg">{{ (sv.trades ?? 0) - (sv.wins ?? 0) }}</td>
                <td :class="(sv.trades ?? 0) > 0 ? numClass(sv.win_rate, 50) : 'muted'">
                  {{ (sv.trades ?? 0) > 0 ? (sv.win_rate ?? 0).toFixed(1) + '%' : '-' }}
                </td>
                <td :class="numClass(sv.pnl)">
                  {{ (sv.pnl ?? 0) >= 0 ? '+' : '' }}{{ fmt(sv.pnl ?? 0) }}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 주간 총평 -->
      <div class="section" v-if="rd.weekly_comment">
        <h2>📝 주간 총평</h2>
        <p class="comment-text">{{ rd.weekly_comment }}</p>
      </div>

      <!-- AI 전략 평가 -->
      <template v-if="evalData">
        <div class="section eval-section" v-if="hasEvalStrategies">
          <h2>🤖 AI 전략 평가</h2>
          <div class="eval-grid">
            <div class="eval-card" v-for="(ev, sid) in evalData.data?.by_strategy" :key="sid">
              <div class="eval-top">
                <span class="eval-name">{{ stratLabel(sid) }}</span>
                <span class="verdict" :class="verdictClass(ev.verdict)">{{ ev.verdict }}</span>
              </div>
              <div class="eval-meta">
                {{ ev.total_trades ?? 0 }}건 &nbsp;·&nbsp;
                승률 {{ ev.win_rate != null ? ev.win_rate.toFixed(1) + '%' : '-' }} &nbsp;·&nbsp;
                <span :class="numClass(ev.total_pnl)">
                  {{ (ev.total_pnl ?? 0) >= 0 ? '+' : '' }}{{ fmt(ev.total_pnl ?? 0) }}원
                </span>
              </div>
              <p class="eval-comment">{{ ev.comment }}</p>
            </div>
          </div>
        </div>

        <!-- 개선 아이디어 -->
        <div class="section" v-if="evalData.data?.improvements?.length">
          <h2>💡 개선 아이디어</h2>
          <div class="idea-list">
            <div class="idea-item" v-for="(idea, i) in evalData.data.improvements" :key="i">
              <div class="idea-header">
                <span class="idea-target">{{ stratLabel(idea.target) }}</span>
                <span class="idea-type" :class="ideaClass(idea.type)">{{ idea.type }}</span>
              </div>
              <p class="idea-text">{{ idea.idea }}</p>
            </div>
          </div>
        </div>

        <!-- 전략 종합 총평 -->
        <div class="section" v-if="evalData.data?.overall">
          <h2>📊 전략 종합 총평</h2>
          <p class="comment-text">{{ evalData.data.overall }}</p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchLatestWeeklyReport, fetchLatestStrategyEvaluation } from '../api.js'

const loading  = ref(true)
const report   = ref(null)
const evalData = ref(null)

// 편의 computed
const rd = computed(() => report.value?.data ?? {})
const rw = computed(() => rd.value?.weekly ?? {})
const hasStrategies     = computed(() => Object.keys(rd.value?.by_strategy ?? {}).length > 0)
const hasEvalStrategies = computed(() => Object.keys(evalData.value?.data?.by_strategy ?? {}).length > 0)

// 전략 라벨 맵
const LABELS = {
  ma_cross:             'MA크로스',
  rsi_reversal:         'RSI역발산',
  bb_reversal:          'BB반등',
  breakout_52w:         '52주신고가',
  rsi_bb_combo:         'RSI+BB복합',
  pullback:             '눌림목',
  consolidation:        '조정구간',
  ma_cross_pending:     '골든크로스 임박',
  breakout_pending:     '52주고가 임박',
  volume_surge_pending: '거래량증가 임박',
}

function stratLabel(sid) {
  if (!sid) return '-'
  return LABELS[sid] ?? sid
}

function fmtStrategy(v) {
  if (!v) return '-'
  return (Array.isArray(v) ? v : [v]).map(x => LABELS[x] || x).join('+')
}

function fmt(n) {
  if (n == null) return '0'
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const str = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rounded < 0 ? '-' + str : str
}

function fmtPct(v) {
  const n = v ?? 0
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

// threshold 이상이면 pos, 미만이면 neg
function numClass(v, threshold = 0) {
  return (v ?? 0) >= threshold ? 'pos' : 'neg'
}

function fmtDatetime(s) {
  if (!s) return ''
  return s.slice(0, 16).replace('T', ' ')
}

function verdictClass(verdict) {
  const map = {
    '양호':     'verdict-good',
    '관찰 중':  'verdict-watch',
    '개선 필요':'verdict-warn',
    '퇴출 권고':'verdict-bad',
  }
  return map[verdict] ?? 'verdict-watch'
}

function ideaClass(type) {
  const map = {
    '조건 강화':   'idea-blue',
    '파라미터 조정':'idea-purple',
    '신규 전략':   'idea-green',
  }
  return map[type] ?? 'idea-blue'
}

async function load() {
  try {
    const [r, e] = await Promise.all([
      fetchLatestWeeklyReport(),
      fetchLatestStrategyEvaluation(),
    ])
    report.value   = r
    evalData.value = e
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* ── 공통 ─────────────────────────────────── */
h1 { font-size: 22px; font-weight: 700; }
h2 { font-size: 15px; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

.pos  { color: #dc2626; }
.neg  { color: #2563eb; }
.muted { color: #aaa; }
.bold { font-weight: 700; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 20px;
}

/* ── 페이지 헤더 ──────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}
.gen-time {
  font-size: 12px;
  color: #aaa;
  margin-top: 4px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s;
  flex-shrink: 0;
}
.back-btn:hover { background: #e5e7eb; }

/* ── 기간 배너 ────────────────────────────── */
.period-bar {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 12px 18px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.period-text { font-size: 14px; font-weight: 600; color: #1e40af; }

/* ── 메트릭 그리드 ────────────────────────── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.metric-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.mc-label { font-size: 12px; color: #888; margin-bottom: 6px; }
.mc-value { font-size: 22px; font-weight: 700; }

/* ── 2열 그리드 ───────────────────────────── */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 4px;
}
.two-col .section { margin-bottom: 0; }

/* ── 통계 목록 ────────────────────────────── */
.stat-list { display: flex; flex-direction: column; gap: 10px; }
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f3f4f6;
}
.stat-row:last-child { border-bottom: none; padding-bottom: 0; }
.sl { color: #888; font-size: 13px; }
.stat-highlight { font-weight: 600; font-size: 15px; }
.stat-highlight .sl { font-weight: 400; }

/* ── 하이라이트 카드 ──────────────────────── */
.highlight {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 10px;
}
.highlight:last-child { margin-bottom: 0; }
.best  { background: #fef2f2; }
.worst { background: #eff6ff; }
.hl-badge { font-size: 12px; font-weight: 600; white-space: nowrap; }
.hl-body  { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hl-ticker { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hl-strat  { font-size: 11px; color: #888; }
.hl-nums  { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.hl-sub  { font-size: 12px; }

/* ── 테이블 ───────────────────────────────── */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
td { padding: 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
th:not(:first-child) { text-align: right; }
td:not(:first-child) { text-align: right; }
.strat-name { font-weight: 500; color: #374151; }

/* ── 총평 ─────────────────────────────────── */
.comment-text {
  font-size: 14px;
  line-height: 1.75;
  color: #374151;
  white-space: pre-wrap;
}

/* ── AI 전략 평가 그리드 ─────────────────── */
.eval-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.eval-card {
  background: #f9fafb;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
}
.eval-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.eval-name  { font-size: 14px; font-weight: 600; flex: 1; }
.eval-meta  { font-size: 12px; color: #888; margin-bottom: 8px; }
.eval-comment { font-size: 13px; line-height: 1.6; color: #374151; white-space: pre-wrap; }

.verdict {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.verdict-good  { background: #dcfce7; color: #166534; }
.verdict-watch { background: #f3f4f6; color: #374151; }
.verdict-warn  { background: #fef9c3; color: #854d0e; }
.verdict-bad   { background: #fee2e2; color: #991b1b; }

/* ── 개선 아이디어 ────────────────────────── */
.idea-list { display: flex; flex-direction: column; gap: 12px; }
.idea-item {
  background: #f9fafb;
  border-radius: 10px;
  padding: 14px 16px;
  border-left: 3px solid #d1d5db;
}
.idea-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.idea-target { font-size: 13px; font-weight: 600; color: #374151; }
.idea-type {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.idea-blue   { background: #dbeafe; color: #1e40af; }
.idea-purple { background: #ede9fe; color: #5b21b6; }
.idea-green  { background: #d1fae5; color: #065f46; }
.idea-text { font-size: 13px; line-height: 1.6; color: #374151; }

/* ── 빈 상태 ──────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 80px 0;
}
.empty-icon  { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.empty-desc  { font-size: 14px; color: #9ca3af; }
.empty-inline { color: #aaa; font-size: 13px; padding: 16px 0; }

/* ── 반응형 ───────────────────────────────── */
@media (max-width: 768px) {
  h1 { font-size: 18px; }
  .page-header { margin-bottom: 16px; }

  .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
  .mc-value { font-size: 18px; }
  .metric-card { padding: 14px; }

  .two-col { grid-template-columns: 1fr; margin-bottom: 0; }
  .two-col .section { margin-bottom: 16px; }

  .section { padding: 16px; margin-bottom: 16px; }

  .eval-grid { grid-template-columns: 1fr; }

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
    text-align: right !important;
  }
  tr td:last-child { border-bottom: none !important; }
  td:nth-child(1)::before { content: '전략';    color: #888; font-size: 12px; font-weight: 600; margin-right: 8px; }
  td:nth-child(2)::before { content: '거래';    color: #888; font-size: 12px; font-weight: 600; margin-right: 8px; }
  td:nth-child(3)::before { content: '승';      color: #888; font-size: 12px; font-weight: 600; margin-right: 8px; }
  td:nth-child(4)::before { content: '패';      color: #888; font-size: 12px; font-weight: 600; margin-right: 8px; }
  td:nth-child(5)::before { content: '승률';    color: #888; font-size: 12px; font-weight: 600; margin-right: 8px; }
  td:nth-child(6)::before { content: '실현 손익'; color: #888; font-size: 12px; font-weight: 600; margin-right: 8px; }
}
</style>
