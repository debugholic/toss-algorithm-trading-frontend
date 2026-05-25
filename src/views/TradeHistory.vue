<template>
  <div>
    <h1>📋 매매 이력</h1>

      <!-- 달력 -->
      <div class="calendar section">
        <div class="cal-header">
          <div class="cal-title">
            <button class="nav-btn" @click="moveMonth(-1)">‹</button>
            <span>{{ selectedMonth.replace('-', '년 ') }}월</span>
            <button class="nav-btn" @click="moveMonth(1)">›</button>
          </div>
        </div>
        <div class="day-names">
          <span v-for="d in ['월','화','수','목','금','토','일']" :key="d">{{ d }}</span>
        </div>
        <div v-for="(week, wi) in calendarWeeks" :key="wi" class="week">
          <div
            v-for="(cell, di) in week"
            :key="di"
            class="day-cell"
            :class="{
              'other-month': cell.other,
              'has-trade': !cell.other && byDate[dateStr(cell.day)],
              selected: !cell.other && dateStr(cell.day) === selectedDate,
            }"
            @click="!cell.other && byDate[dateStr(cell.day)] && (selectedDate = dateStr(cell.day))"
          >
            <span class="day-num">{{ cell.day }}</span>
            <span
              v-if="!cell.other && byDate[dateStr(cell.day)]"
              class="day-pnl"
              :class="byDate[dateStr(cell.day)].pnl >= 0 ? 'pos' : 'neg'"
            >
              {{ byDate[dateStr(cell.day)].pnl >= 0 ? '+' : '' }}{{ fmt(byDate[dateStr(cell.day)].pnl) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 날짜 상세 -->
      <div v-if="selectedDate && byDate[selectedDate]" class="section">
        <h2>{{ selectedDate }} 매매 내역</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>일시</th><th>마켓</th><th>구분</th><th>종목명</th><th>수량</th>
                <th>단가</th><th>금액</th><th>손익</th><th>수익률</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in byDate[selectedDate].trades" :key="i">
                <td>{{ t.date.slice(5) }}</td>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchTrades } from '../api.js'

const trades = ref([])
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const selectedDate = ref('')

const fmt = n => {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const str = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rounded < 0 ? '-' + str : str
}
const fmtUsd = n => (n == null ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

const months = computed(() => {
  const s = new Set(trades.value.map(t => t.date.slice(0, 7)))
  return [...s].sort().reverse()
})

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
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const lastDay = new Date(y, m, 0).getDate()
  const prevLastDay = new Date(y, m - 1, 0).getDate()

  const days = []
  for (let i = firstDow - 1; i >= 0; i--)
    days.push({ day: prevLastDay - i, other: true })
  for (let d = 1; d <= lastDay; d++)
    days.push({ day: d, other: false })
  let next = 1
  while (days.length < 42)
    days.push({ day: next++, other: true })

  const weeks = []
  for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
})

function moveMonth(delta) {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  selectedDate.value = ''
}

function dateStr(day) {
  if (!day || !selectedMonth.value) return ''
  return `${selectedMonth.value}-${String(day).padStart(2, '0')}`
}

watch(months, v => { if (v.length && !trades.value.some(t => t.date.startsWith(selectedMonth.value))) selectedMonth.value = v[0] })

onMounted(async () => { trades.value = await fetchTrades().catch(() => []) })
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 24px; }
h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 16px;
}

.table-wrap { overflow-x: auto; }

.cal-header { display: flex; justify-content: center; margin-bottom: 12px; }
.cal-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cal-title span { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.nav-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #888;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  vertical-align: middle;
  position: relative;
  top: -1px;
}
.nav-btn:hover { color: #1a1a2e; }

.day-names {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.day-names span {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  padding: 4px 0;
}

.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.day-cell {
  min-height: 56px;
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #555;
  background: #f9f9fb;
}
.day-cell.has-trade { cursor: pointer; border: 1px solid #ddd; }
.day-cell.has-trade:hover { background: #f0f4ff; }
.day-cell.selected { border: 2px solid #2563eb !important; background: #eff6ff; }
.day-cell.other-month { background: transparent; }
.day-cell.other-month .day-num { color: #ccc; }

.day-num { font-weight: 600; font-size: 14px; }
.day-pnl { font-size: 11px; margin-top: 2px; }

table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; overflow: hidden; }
td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
th:nth-child(1) { width: 16%; } /* 일시 */
th:nth-child(2) { width: 6%; }  /* 마켓 */
th:nth-child(3) { width: 6%; }  /* 구분 */
th:nth-child(4) { width: 15%; } /* 종목명 */
th:nth-child(5) { width: 6%; }  /* 수량 */
th:nth-child(6) { width: 13%; } /* 단가 */
th:nth-child(7) { width: 13%; } /* 금액 */
th:nth-child(8) { width: 12%; } /* 손익 */
th:nth-child(9) { width: 13%; } /* 수익률 */
tr:last-child td { border-bottom: none; }

.pos { color: #e74c3c; }
.neg { color: #2563eb; }
.buy { color: #e74c3c; font-weight: 600; }
.sell { color: #2563eb; font-weight: 600; }
.empty { color: #aaa; padding: 16px 0; }

@media (max-width: 768px) {
  h1 { font-size: 18px; margin-bottom: 16px; }
  .section { padding: 14px; }
  .day-cell { min-height: 42px; padding: 4px 2px; overflow: hidden; }
  .day-num { font-size: 12px; }
  .day-pnl { font-size: 10px; white-space: nowrap; }

  .table-wrap table, .table-wrap thead, .table-wrap tbody, .table-wrap tr { display: block; }
  .table-wrap thead { display: none; }
  .table-wrap tr {
    background: #f9f9fb;
    border-radius: 10px;
    margin-bottom: 10px;
    border: 1px solid #eee;
  }
  .table-wrap td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid #f0f0f0 !important;
    white-space: normal;
    font-size: 13px;
  }
  .table-wrap tr td:last-child { border-bottom: none !important; }
  .table-wrap td::before {
    color: #888;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    margin-right: 8px;
  }
  .table-wrap td:nth-child(1)::before { content: '일시'; }
  .table-wrap td:nth-child(2)::before { content: '마켓'; }
  .table-wrap td:nth-child(3)::before { content: '구분'; }
  .table-wrap td:nth-child(4)::before { content: '종목명'; }
  .table-wrap td:nth-child(5)::before { content: '수량'; }
  .table-wrap td:nth-child(6)::before { content: '단가'; }
  .table-wrap td:nth-child(7)::before { content: '금액'; }
  .table-wrap td:nth-child(8)::before { content: '손익'; }
  .table-wrap td:nth-child(9)::before { content: '수익률'; }
}
</style>
