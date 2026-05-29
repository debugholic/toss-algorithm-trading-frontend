<template>
  <div>
    <div class="page-header">
      <h1>매매 이력</h1>
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'calendar' }" @click="viewMode = 'calendar'">달력</button>
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">목록</button>
      </div>
    </div>

    <!-- ── 달력 뷰 ──────────────────────────────────────── -->
    <template v-if="viewMode === 'calendar'">
      <div class="calendar section">
        <div class="cal-header">
          <div class="cal-title">
            <button class="nav-btn" @click="moveMonth(-1)">‹</button>
            <span>{{ selectedMonth.replace('-', '년 ') }}월</span>
            <button class="nav-btn" @click="moveMonth(1)">›</button>
          </div>
        </div>
        <div class="day-names">
          <span v-for="(d, i) in ['일','월','화','수','목','금','토']" :key="d" :class="{ sunday: i === 0, saturday: i === 6 }">{{ d }}</span>
        </div>
        <div v-for="(week, wi) in calendarWeeks" :key="wi" class="week">
          <div
            v-for="(cell, di) in week"
            :key="di"
            class="day-cell"
            :class="{
              'other-month': cell.other,
              'has-trade':   !cell.other && byDate[dateStr(cell.day)],
              'is-holiday':  !cell.other && holidays[dateStr(cell.day)],
              selected:      !cell.other && dateStr(cell.day) === selectedDate,
            }"
            @click="!cell.other && byDate[dateStr(cell.day)] && (selectedDate = dateStr(cell.day))"
          >
            <span class="day-num">{{ cell.day }}</span>
            <span v-if="!cell.other && holidays[dateStr(cell.day)]" class="day-holiday" :title="holidays[dateStr(cell.day)]">
              {{ shortHoliday(holidays[dateStr(cell.day)]) }}
            </span>
            <span
              v-if="!cell.other && byDate[dateStr(cell.day)]"
              class="day-pnl"
              :class="byDate[dateStr(cell.day)].pnl >= 0 ? 'pos' : 'neg'"
            >
              {{ fmtCal(byDate[dateStr(cell.day)].pnl) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 날짜 상세 -->
      <div v-if="selectedDate && byDate[selectedDate]" class="section detail-section">
        <div class="day-summary">
          <span class="day-summary-title">{{ selectedDate }} 매매 내역</span>
          <span v-if="byDate[selectedDate].pnl !== 0"
                class="day-summary-pnl" :class="byDate[selectedDate].pnl >= 0 ? 'pos' : 'neg'">
            {{ (byDate[selectedDate].pnl >= 0 ? '+' : '') + fmt(byDate[selectedDate].pnl) }}원
          </span>
        </div>

        <!-- 짝 보기 (SELL 있는 날) -->
        <div v-if="selectedPairs" class="table-wrap">
          <table class="pair-table">
            <thead>
              <tr>
                <th class="col-name">종목</th>
                <th class="col-strat">전략</th>
                <th class="col-buydate">매수일</th>
                <th class="col-hold">보유</th>
                <th class="col-price">매수가</th>
                <th class="col-price">매도가</th>
                <th class="col-pnl">손익</th>
                <th class="col-pct">수익률</th>
                <th class="col-result">결과</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in selectedPairs" :key="i">
                <td class="pair-name">
                  <span>{{ p.market === 'US' ? '🇺🇸' : '🇰🇷' }} {{ p.name }}</span>
                </td>
                <td class="strat-cell">{{ fmtStrategy(p.strategy) }}</td>
                <td class="td-date">{{ p.buy_date ?? '-' }}</td>
                <td class="hold-cell">{{ p.hold_days != null ? p.hold_days + '일' : '-' }}</td>
                <td>{{ fmtPrice(p.avg_buy_price, p.market) }}</td>
                <td>{{ fmtPrice(p.sell_price, p.market) }}</td>
                <td :class="(p.pnl || 0) >= 0 ? 'pos' : 'neg'">
                  {{ p.pnl != null ? (p.pnl >= 0 ? '+' : '') + fmt(p.pnl) : '-' }}
                </td>
                <td :class="(p.pnl_pct || 0) >= 0 ? 'pos' : 'neg'">
                  {{ p.pnl_pct != null ? (p.pnl_pct >= 0 ? '+' : '') + p.pnl_pct.toFixed(2) + '%' : '-' }}
                </td>
                <td><span class="exit-badge" :class="exitClass(p)">{{ exitLabel(p) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 원본 보기 (BUY만 있는 날) -->
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>일시</th><th>마켓</th><th>구분</th><th>종목명</th><th>수량</th>
                <th>단가</th><th>금액</th><th>손익</th><th>수익률</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in byDate[selectedDate].trades" :key="i">
                <td class="td-date">{{ t.date }}</td>
                <td>{{ t.market === 'US' ? '🇺🇸' : '🇰🇷' }}</td>
                <td :class="t.type === 'BUY' ? 'buy' : 'sell'">{{ t.type }}</td>
                <td>{{ t.name }}</td>
                <td>{{ t.shares }}</td>
                <td>{{ t.price != null ? (t.market === 'US' ? '$' + fmtUsd(t.price) : fmt(t.price)) : '-' }}</td>
                <td>{{ t.amount != null ? fmt(t.amount) : '-' }}</td>
                <td :class="(t.pnl || 0) >= 0 ? 'pos' : 'neg'">
                  {{ t.pnl != null ? ((t.pnl >= 0 ? '+' : '') + fmt(t.pnl)) : '-' }}
                </td>
                <td :class="(t.pnl_pct || 0) >= 0 ? 'pos' : 'neg'">
                  {{ t.pnl_pct != null ? ((t.pnl_pct >= 0 ? '+' : '') + t.pnl_pct.toFixed(2) + '%') : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ── 짝 목록 뷰 ────────────────────────────────────── -->
    <template v-else>
      <div class="section list-section">
        <div class="list-header">
          <div class="list-stats">
            <span>총 {{ allPairs.length }}건</span>
            <span class="stat-sep">·</span>
            <span class="pos">익절 {{ winCount }}건</span>
            <span class="stat-sep">·</span>
            <span class="neg">손절/손매도 {{ lossCount }}건</span>
            <span class="stat-sep">·</span>
            <span class="holding">보유 중 {{ holdingCount }}건</span>
          </div>
          <div class="list-filter">
            <button v-for="f in FILTERS" :key="f.value"
                    :class="{ active: listFilter === f.value }"
                    @click="listFilter = f.value">
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="pair-table list-table">
            <thead>
              <tr>
                <th class="col-name">종목</th>
                <th class="col-strat">전략</th>
                <th class="col-dates">매수일</th>
                <th class="col-dates">매도일</th>
                <th class="col-hold">보유</th>
                <th class="col-price">매수가</th>
                <th class="col-price">매도가</th>
                <th class="col-pnl">손익</th>
                <th class="col-pct">수익률</th>
                <th class="col-result">결과</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in filteredPairs" :key="i">
                <td class="pair-name">
                  <span>{{ p.market === 'US' ? '🇺🇸' : '🇰🇷' }} {{ p.name }}</span>
                </td>
                <td class="strat-cell">{{ fmtStrategy(p.strategy) }}</td>
                <td class="td-date">{{ p.buy_date ?? '-' }}</td>
                <td class="td-date">{{ p.sell_date ?? '-' }}</td>
                <td class="hold-cell">{{ p.hold_days != null ? p.hold_days + '일' : '-' }}</td>
                <td>{{ fmtPrice(p.avg_buy_price, p.market) }}</td>
                <td>{{ fmtPrice(p.sell_price, p.market) }}</td>
                <td :class="(p.pnl || 0) >= 0 ? 'pos' : 'neg'">
                  {{ p.pnl != null ? (p.pnl >= 0 ? '+' : '') + fmt(p.pnl) : '-' }}
                </td>
                <td :class="(p.pnl_pct || 0) >= 0 ? 'pos' : 'neg'">
                  {{ p.pnl_pct != null ? (p.pnl_pct >= 0 ? '+' : '') + p.pnl_pct.toFixed(2) + '%' : '-' }}
                </td>
                <td><span class="exit-badge" :class="exitClass(p)">{{ exitLabel(p) }}</span></td>
              </tr>
              <tr v-if="!filteredPairs.length">
                <td colspan="10" class="empty">거래 내역 없음</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchTrades } from '../api.js'

const trades      = ref([])
const viewMode    = ref('calendar')
const listFilter  = ref('all')
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const selectedDate  = ref('')
const holidays      = ref({})
const fetchedYears  = new Set()

const FILTERS = [
  { value: 'all',     label: '전체' },
  { value: 'closed',  label: '종료' },
  { value: 'holding', label: '보유 중' },
]

const STRAT_LABELS = {
  ma_cross:             'MA크로스',
  rsi_reversal:         'RSI역발산',
  bb_reversal:          'BB반등',
  breakout_52w:         '52주 신고가',
  rsi_bb_combo:         'RSI+BB복합',
  pullback:             '눌림목',
  consolidation:        '조정구간',
  ma_cross_pending:     '골든크로스 임박',
  breakout_pending:     '52주 고가 임박',
  volume_surge_pending: '거래량증가 임박',
}

// ── BUY/SELL 짝 매칭 (FIFO) ──────────────────────────────────
function buildPairs(allTrades) {
  const sorted = [...allTrades].sort((a, b) => a.date.localeCompare(b.date))
  const open = {}   // code → { buys: [], remainingShares: N }
  const pairs = []

  for (const t of sorted) {
    const code = t.code

    if (t.type === 'BUY') {
      if (!open[code]) open[code] = { buys: [], remainingShares: 0 }
      open[code].buys.push(t)
      open[code].remainingShares += t.shares || 0

    } else {
      // SELL or STOP — 해당 종목의 가장 오래된 미청산 매수와 짝
      const slot = open[code] || { buys: [], remainingShares: 0 }
      const buys = slot.buys
      const totalBuyShares = buys.reduce((s, b) => s + (b.shares || 0), 0)
      const avgBuyPrice = totalBuyShares > 0
        ? buys.reduce((s, b) => s + (b.price || 0) * (b.shares || 0), 0) / totalBuyShares
        : null

      pairs.push({
        code,
        name:          t.name,
        market:        t.market || 'KR',
        strategy:      buys[0]?.strategy || t.strategy,
        buy_date:      buys[0]?.date?.slice(0, 10) ?? null,
        sell_date:     t.date.slice(0, 10),
        hold_days:     calcHoldDays(buys[0]?.date, t.date),
        avg_buy_price: avgBuyPrice,
        sell_price:    t.price,
        shares:        t.shares,
        pnl:           t.pnl,
        pnl_pct:       t.pnl_pct,
        exit_type:     t.type,
        buy_count:     buys.length,
      })

      slot.remainingShares -= t.shares || 0
      if (slot.remainingShares <= 0) delete open[code]
    }
  }

  // 아직 청산 안 된 포지션
  for (const [code, slot] of Object.entries(open)) {
    if (!slot.buys.length) continue
    const buys = slot.buys
    const totalShares = buys.reduce((s, b) => s + (b.shares || 0), 0)
    const avgBuyPrice = totalShares > 0
      ? buys.reduce((s, b) => s + (b.price || 0) * (b.shares || 0), 0) / totalShares
      : null
    pairs.push({
      code,
      name:          buys[0].name,
      market:        buys[0].market || 'KR',
      strategy:      buys[0].strategy,
      buy_date:      buys[0].date.slice(0, 10),
      sell_date:     null,
      hold_days:     null,
      avg_buy_price: avgBuyPrice,
      sell_price:    null,
      shares:        slot.remainingShares,
      pnl:           null,
      pnl_pct:       null,
      exit_type:     null,
      buy_count:     buys.length,
    })
  }

  // 정렬: 청산 → 매도일 최신순 / 보유 중 → 매수일 최신순 (맨 아래)
  pairs.sort((a, b) => {
    if ( a.sell_date && !b.sell_date) return -1
    if (!a.sell_date &&  b.sell_date) return  1
    const ad = a.sell_date || a.buy_date || ''
    const bd = b.sell_date || b.buy_date || ''
    return bd.localeCompare(ad)
  })
  return pairs
}

function calcHoldDays(buyDate, sellDate) {
  if (!buyDate || !sellDate) return null
  return Math.round((new Date(sellDate.slice(0, 10)) - new Date(buyDate.slice(0, 10))) / 86400000)
}

// ── computed ──────────────────────────────────────────────────
const allPairs = computed(() => buildPairs(trades.value))

const filteredPairs = computed(() => {
  if (listFilter.value === 'closed')  return allPairs.value.filter(p =>  p.sell_date)
  if (listFilter.value === 'holding') return allPairs.value.filter(p => !p.sell_date)
  return allPairs.value
})

const winCount     = computed(() => allPairs.value.filter(p =>  p.sell_date && (p.pnl || 0) >= 0).length)
const lossCount    = computed(() => allPairs.value.filter(p =>  p.sell_date && (p.pnl || 0) <  0).length)
const holdingCount = computed(() => allPairs.value.filter(p => !p.sell_date).length)

// 달력 상세: 선택 날짜에 SELL 이 있으면 짝 반환
const selectedPairs = computed(() => {
  if (!selectedDate.value) return null
  const result = allPairs.value.filter(p => p.sell_date === selectedDate.value)
  return result.length ? result : null
})

// ── 포맷 함수 ─────────────────────────────────────────────────
function fmtStrategy(v) {
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
  return arr.map(x => STRAT_LABELS[x] || x).join('+')
}

function fmtPrice(price, market) {
  if (price == null) return '-'
  return market === 'US' ? '$' + fmtUsd(price) : fmt(price)
}

function exitLabel(p) {
  if (!p.exit_type) return '보유 중'
  if (p.exit_type === 'STOP') return '손절'
  return (p.pnl || 0) >= 0 ? '익절' : '손매도'
}

function exitClass(p) {
  if (!p.exit_type) return 'badge-holding'
  if (p.exit_type === 'STOP') return 'badge-stop'
  return (p.pnl || 0) >= 0 ? 'badge-win' : 'badge-loss'
}

// ── 달력 ──────────────────────────────────────────────────────
function fmtCal(n) {
  if (n == null) return ''
  const sign = n >= 0 ? '+' : '-'
  const abs = Math.abs(Math.round(n))
  if (abs >= 10000) return sign + Math.round(abs / 10000) + '만'
  return sign + abs.toLocaleString()
}

function shortHoliday(name) {
  const BREAK = {
    '부처님 오신 날': '부처님\n오신 날',
    '설날 연휴': '설날\n연휴',
    '추석 연휴': '추석\n연휴',
    '대체 공휴일': '대체\n공휴일',
    '대체공휴일': '대체\n공휴일',
  }
  return BREAK[name] ?? name
}

async function loadHolidays(year) {
  if (fetchedYears.has(year)) return
  fetchedYears.add(year)
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`)
    if (!res.ok) return
    const data = await res.json()
    data.forEach(h => { holidays.value[h.date] = h.localName })
  } catch {}
}

const fmt = n => {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  return (rounded < 0 ? '-' : '') + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
const fmtUsd = n => (n == null ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

const byDate = computed(() => {
  const result = {}
  trades.value
    .filter(t => t.date.startsWith(selectedMonth.value))
    .forEach(t => {
      const d = t.date.slice(0, 10)
      if (!result[d]) result[d] = { trades: [], pnl: 0 }
      result[d].trades.push(t)
      result[d].pnl += t.pnl || 0
    })
  return result
})

const calendarWeeks = computed(() => {
  if (!selectedMonth.value) return []
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const firstDow = new Date(y, m - 1, 1).getDay()
  const lastDay = new Date(y, m, 0).getDate()
  const prevLastDay = new Date(y, m - 1, 0).getDate()

  const days = []
  for (let i = firstDow - 1; i >= 0; i--) days.push({ day: prevLastDay - i, other: true })
  for (let d = 1; d <= lastDay; d++)        days.push({ day: d, other: false })
  let next = 1
  while (days.length < 42) days.push({ day: next++, other: true })

  const weeks = []
  for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
})

function moveMonth(delta) {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  selectedDate.value = ''
  loadHolidays(d.getFullYear())
}

function dateStr(day) {
  if (!day || !selectedMonth.value) return ''
  return `${selectedMonth.value}-${String(day).padStart(2, '0')}`
}

const months = computed(() => {
  const s = new Set(trades.value.map(t => t.date.slice(0, 7)))
  return [...s].sort().reverse()
})

watch(months, v => {
  if (v.length && !trades.value.some(t => t.date.startsWith(selectedMonth.value)))
    selectedMonth.value = v[0]
})

onMounted(async () => {
  trades.value = await fetchTrades().catch(() => [])
  loadHolidays(new Date().getFullYear())
})
</script>

<style scoped>
/* ── 공통 ──────────────────────────────────────── */
h1 { font-size: 22px; font-weight: 700; }
.pos     { color: #e74c3c; }
.neg     { color: #2563eb; }
.holding { color: #7c3aed; }
.buy     { color: #e74c3c; font-weight: 600; }
.sell    { color: #2563eb; font-weight: 600; }
.empty   { color: #aaa; padding: 16px 0; text-align: center; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 16px;
}
.section.detail-section { padding: 0; overflow: hidden; }

/* ── 헤더 / 토글 ────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 3px;
  border-radius: 8px;
}
.view-toggle button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: #888;
  transition: background 0.15s, color 0.15s;
}
.view-toggle button.active {
  background: #fff;
  color: #1a1a2e;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}

/* ── 달력 ───────────────────────────────────────── */
.cal-header { display: flex; justify-content: center; margin-bottom: 12px; }
.cal-title { display: flex; align-items: center; gap: 6px; }
.cal-title span { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.nav-btn {
  background: none; border: none; font-size: 20px; color: #888;
  cursor: pointer; padding: 0 2px; line-height: 1; vertical-align: middle; position: relative; top: -1px;
}
.nav-btn:hover { color: #1a1a2e; }

.day-names {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px;
}
.day-names span { text-align: center; font-size: 12px; font-weight: 600; color: #888; padding: 4px 0; }
.day-names .sunday { color: #e74c3c; }
.day-names .saturday { color: #2563eb; }

.week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }

.day-cell {
  min-height: 68px; border-radius: 8px; padding: 8px 4px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; font-size: 13px; color: #555; background: #f9f9fb;
}
.day-cell.has-trade { cursor: pointer; border: 1px solid #ddd; }
.day-cell.has-trade:hover { background: #f0f4ff; }
.day-cell.selected { border: 2px solid #2563eb !important; background: #eff6ff; }
.day-cell.other-month { background: transparent; }
.day-cell.other-month .day-num { color: #ccc; }

.day-num { font-weight: 600; font-size: 13px; }
.day-holiday { font-size: 8px; color: #e74c3c; line-height: 1.3; text-align: center; white-space: nowrap; overflow: hidden; width: 100%; }
.is-holiday .day-num { color: #e74c3c; }
.day-pnl { font-size: 10px; margin-top: 1px; }

/* ── 일별 상세 ──────────────────────────────────── */
.day-summary {
  display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px;
}
.day-summary-title { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.day-summary-pnl { font-size: 20px; font-weight: 700; }

/* ── 짝 목록 뷰 헤더 ──────────────────────────── */
.list-section { padding: 20px 24px; }
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.list-stats { font-size: 13px; color: #555; display: flex; align-items: center; gap: 6px; }
.stat-sep { color: #ddd; }
.list-filter { display: flex; gap: 4px; background: #f3f4f6; padding: 3px; border-radius: 8px; }
.list-filter button {
  padding: 4px 12px; border: none; border-radius: 5px; font-size: 12px;
  cursor: pointer; background: transparent; color: #888; transition: background 0.15s, color 0.15s;
}
.list-filter button.active { background: #fff; color: #1a1a2e; box-shadow: 0 1px 3px rgba(0,0,0,.1); }

/* ── 테이블 공통 ────────────────────────────────── */
.table-wrap { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
tr:last-child td { border-bottom: none; }

/* ── 짝 테이블 컬럼 너비 ───────────────────────── */
.pair-table .col-name    { width: 17%; }
.pair-table .col-strat   { width: 11%; }
.pair-table .col-buydate { width: 11%; }
.pair-table .col-dates   { width: 11%; }
.pair-table .col-hold    { width: 6%; text-align: center; }
.pair-table .col-price   { width: 10%; text-align: right; }
.pair-table .col-pnl     { width: 11%; text-align: right; }
.pair-table .col-pct     { width: 10%; text-align: right; }
.pair-table .col-result  { width: 8%; text-align: center; }

.pair-table td:nth-child(4),
.pair-table td:nth-child(5)  { text-align: center; }
.pair-table td:nth-child(6),
.pair-table td:nth-child(7),
.pair-table td:nth-child(8),
.pair-table td:nth-child(9)  { text-align: right; }
.pair-table td:nth-child(10) { text-align: center; }

.list-table td:nth-child(3),
.list-table td:nth-child(4)  { text-align: left; }  /* 매수일/매도일 왼쪽 정렬 */
.list-table td:nth-child(5)  { text-align: center; }
.list-table td:nth-child(6),
.list-table td:nth-child(7),
.list-table td:nth-child(8),
.list-table td:nth-child(9)  { text-align: right; }
.list-table td:nth-child(10) { text-align: center; }

/* 원본 BUY-only 테이블 컬럼 정렬 */
table:not(.pair-table) th:nth-child(5),
table:not(.pair-table) th:nth-child(6),
table:not(.pair-table) th:nth-child(7),
table:not(.pair-table) th:nth-child(8),
table:not(.pair-table) th:nth-child(9) { text-align: right; }
table:not(.pair-table) td:nth-child(5),
table:not(.pair-table) td:nth-child(6),
table:not(.pair-table) td:nth-child(7),
table:not(.pair-table) td:nth-child(8),
table:not(.pair-table) td:nth-child(9) { text-align: right; }

.pair-name { font-weight: 500; }
.mkt { margin-right: 4px; }
.strat-cell { font-size: 12px; color: #555; }
.td-date { font-size: 12px; letter-spacing: -0.3px; color: #555; }
.hold-cell { font-size: 12px; color: #888; text-align: center; }

/* ── 결과 배지 ──────────────────────────────────── */
.exit-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-win     { background: #fef2f2; color: #dc2626; }
.badge-loss    { background: #eff6ff; color: #2563eb; }
.badge-stop    { background: #fff7ed; color: #c2410c; }
.badge-holding { background: #f5f3ff; color: #7c3aed; }

/* ── 반응형 ─────────────────────────────────────── */
@media (max-width: 768px) {
  h1 { font-size: 18px; }
  .page-header { margin-bottom: 14px; }
  .view-toggle button { padding: 5px 10px; font-size: 12px; }

  .section { padding: 14px; }
  .section.detail-section { padding: 0; }
  .day-summary { padding: 14px 16px; }
  .day-summary-title { font-size: 13px; }
  .day-summary-pnl { font-size: 18px; }
  .day-holiday { white-space: pre-line; }
  .day-cell { min-height: 42px; padding: 4px 2px; overflow: hidden; }
  .day-num { font-size: 11px; }
  .day-pnl { font-size: 9px; white-space: nowrap; }

  .list-section { padding: 14px; }
  .list-header { flex-direction: column; align-items: flex-start; }

  /* 모바일: 테이블 → 카드형 */
  .table-wrap table, .table-wrap thead, .table-wrap tbody, .table-wrap tr { display: block; }
  .table-wrap thead { display: none; }
  .table-wrap tr {
    background: #f9f9fb;
    border-radius: 10px;
    margin-bottom: 12px;
    border: 1px solid #eee;
  }
  .detail-section .table-wrap { padding: 4px 0 16px; }
  .list-section .table-wrap tr { margin: 0 0 12px; }
  .table-wrap td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid #f0f0f0 !important;
    white-space: normal;
    font-size: 13px;
    text-align: right !important;
  }
  .table-wrap tr td:last-child { border-bottom: none !important; }
  .table-wrap td::before {
    color: #888; font-size: 12px; font-weight: 600; flex-shrink: 0; margin-right: 8px; text-align: left;
  }

  /* 짝 테이블 모바일 라벨 (달력 상세 - 9열) */
  .detail-section .pair-table td:nth-child(1)::before { content: '종목'; }
  .detail-section .pair-table td:nth-child(2)::before { content: '전략'; }
  .detail-section .pair-table td:nth-child(3)::before { content: '매수일'; }
  .detail-section .pair-table td:nth-child(4)::before { content: '보유'; }
  .detail-section .pair-table td:nth-child(5)::before { content: '매수가'; }
  .detail-section .pair-table td:nth-child(6)::before { content: '매도가'; }
  .detail-section .pair-table td:nth-child(7)::before { content: '손익'; }
  .detail-section .pair-table td:nth-child(8)::before { content: '수익률'; }
  .detail-section .pair-table td:nth-child(9)::before { content: '결과'; }

  /* 짝 목록 테이블 모바일 라벨 (10열) */
  .list-section .pair-table td:nth-child(1)::before  { content: '종목'; }
  .list-section .pair-table td:nth-child(2)::before  { content: '전략'; }
  .list-section .pair-table td:nth-child(3)::before  { content: '매수일'; }
  .list-section .pair-table td:nth-child(4)::before  { content: '매도일'; }
  .list-section .pair-table td:nth-child(5)::before  { content: '보유'; }
  .list-section .pair-table td:nth-child(6)::before  { content: '매수가'; }
  .list-section .pair-table td:nth-child(7)::before  { content: '매도가'; }
  .list-section .pair-table td:nth-child(8)::before  { content: '손익'; }
  .list-section .pair-table td:nth-child(9)::before  { content: '수익률'; }
  .list-section .pair-table td:nth-child(10)::before { content: '결과'; }

  /* 원본 BUY 테이블 모바일 라벨 */
  .detail-section table:not(.pair-table) td:nth-child(1)::before { content: '일시'; }
  .detail-section table:not(.pair-table) td:nth-child(2)::before { content: '마켓'; }
  .detail-section table:not(.pair-table) td:nth-child(3)::before { content: '구분'; }
  .detail-section table:not(.pair-table) td:nth-child(4)::before { content: '종목명'; }
  .detail-section table:not(.pair-table) td:nth-child(5)::before { content: '수량'; }
  .detail-section table:not(.pair-table) td:nth-child(6)::before { content: '단가'; }
  .detail-section table:not(.pair-table) td:nth-child(7)::before { content: '금액'; }
  .detail-section table:not(.pair-table) td:nth-child(8)::before { content: '손익'; }
  .detail-section table:not(.pair-table) td:nth-child(9)::before { content: '수익률'; }
}
</style>
