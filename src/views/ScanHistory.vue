<template>
  <div>
    <h1>스캔 이력</h1>
    <p class="caption">
      <span v-if="market === 'KR'">매일 15:35 KST 자동 스캔 · ADX 기준 전략 자동 선택</span>
      <span v-else>매일 06:05 KST 자동 스캔 · ADX 기준 전략 자동 선택</span>
    </p>

    <div class="tabs">
      <button :class="['tab', { active: market === 'KR' }]" @click="market = 'KR'">
        🇰🇷 한국장
        <span v-if="krPendingCount" class="tab-badge">{{ krPendingCount }}</span>
      </button>
      <button :class="['tab', { active: market === 'US' }]" @click="market = 'US'">
        🇺🇸 미국장
        <span v-if="usPendingCount" class="tab-badge">{{ usPendingCount }}</span>
      </button>
    </div>

    <div v-if="filteredPending.length" class="section pending-section">
      <button class="pending-header" @click="pendingOpen = !pendingOpen">
        <h2>⏳ 내일 매수 대기 중 ({{ filteredPending.length }}종목)</h2>
        <span class="chevron">{{ pendingOpen ? '▲' : '▼' }}</span>
      </button>
      <div v-if="!pendingOpen" class="pending-chips">
        <span v-for="g in pendingGroups" :key="g.regime" class="chip">{{ g.regime }} {{ g.count }}종목</span>
      </div>
      <table v-else>
        <thead>
          <tr><th>종목명</th><th>추세</th><th class="th-right">ADX</th></tr>
        </thead>
        <tbody>
          <tr v-for="[code, v] in filteredPending" :key="code">
            <td>{{ v.name }}</td>
            <td>{{ v.regime || '-' }}</td>
            <td class="td-right">{{ v.adx != null ? v.adx.toFixed(1) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!visibleScans.length" class="empty">
      스캔 이력 없음. 매일 {{ market === 'KR' ? '15:35' : '06:05' }} KST 자동 실행됩니다.
    </div>
    <div v-else class="section-list">
      <div v-for="entry in visibleScans" :key="entry.scanned_at" class="scan-entry">
        <button class="entry-header" @click="toggle(entry.scanned_at)">
          <span>
            <span class="entry-icon">📅</span>
            {{ fmtDate(entry.scanned_at) }} — {{ marketResults(entry).length }}종목
          </span>
          <span class="chevron">{{ open[entry.scanned_at] ? '▲' : '▼' }}</span>
        </button>
        <div v-if="open[entry.scanned_at]" class="entry-body">
          <div v-if="!marketResults(entry).length" class="empty">조건 충족 종목 없음</div>
          <table v-else>
            <thead>
              <tr><th>종목명</th><th>신호</th><th>추세</th><th class="th-right">ADX</th><th class="th-right">현재가</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in marketResults(entry)" :key="r.code">
                <td>{{ r.name }}</td>
                <td>{{ r.signal }}</td>
                <td>{{ r.regime }}</td>
                <td class="td-right">{{ r.adx }}</td>
                <td class="td-right">{{ fmtPrice(r.price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button v-if="showMoreAvailable" class="more-btn" @click="visibleCount += 5">
        이전 기록 더 보기 ({{ remainingCount }}개)
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchScans, fetchPending } from '../api.js'

const scans = ref([])
const pending = ref({})
const open = ref({})
const market = ref('KR')
const pendingOpen = ref(false)
const visibleCount = ref(5)

const isKR = code => /^\d{4,6}$/.test(code)

function fmtDate(ts) {
  if (!ts) return '-'
  const kst = new Date(new Date(ts).getTime() + 9 * 3600 * 1000)
  return kst.toISOString().slice(0, 10) + ' ' + kst.toISOString().slice(11, 16) + ' KST'
}

function toggle(key) {
  open.value[key] = !open.value[key]
}

function fmtPrice(price) {
  if (price == null || price === '') return '-'
  return Number(price).toLocaleString()
}

function marketResults(entry) {
  return (entry.results ?? []).filter(r =>
    market.value === 'KR' ? isKR(r.code) : !isKR(r.code)
  )
}

const filteredPending = computed(() =>
  Object.entries(pending.value).filter(([code]) =>
    market.value === 'KR' ? isKR(code) : !isKR(code)
  )
)

const pendingGroups = computed(() => {
  const map = {}
  filteredPending.value.forEach(([, v]) => {
    const key = v.regime || '기타'
    map[key] = (map[key] ?? 0) + 1
  })
  return Object.entries(map).map(([regime, count]) => ({ regime, count }))
})

const krPendingCount = computed(() =>
  Object.keys(pending.value).filter(isKR).length
)
const usPendingCount = computed(() =>
  Object.keys(pending.value).filter(c => !isKR(c)).length
)

const sortedScans = computed(() =>
  scans.value.filter(entry => marketResults(entry).length > 0)
)

const visibleScans = computed(() => sortedScans.value.slice(0, visibleCount.value))

const showMoreAvailable = computed(() => sortedScans.value.length > visibleCount.value)
const remainingCount = computed(() => sortedScans.value.length - visibleCount.value)

onMounted(async () => {
  [scans.value, pending.value] = await Promise.all([fetchScans(), fetchPending()])
})
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
h2 { font-size: 15px; font-weight: 600; margin: 0; }
.caption { color: #888; font-size: 13px; margin-bottom: 20px; }

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 20px;
  border: 1.5px solid #e0e0e0;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  transition: all .15s;
}
.tab.active {
  background: #1a1a2e;
  border-color: #1a1a2e;
  color: #fff;
}
.tab-badge {
  background: #e74c3c;
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
}
.tab.active .tab-badge { background: rgba(255,255,255,.3); }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 16px;
  overflow: hidden;
}

.pending-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.pending-header:hover { background: #f9f9fb; }

.pending-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 20px 14px;
}
.chip {
  background: #f0f4ff;
  color: #3b5bdb;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
}

.section table { width: 100%; border-collapse: collapse; font-size: 13px; }
.section th { text-align: left; padding: 8px 20px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
.section td { padding: 8px 20px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.section tr:last-child td { border-bottom: none; }
.th-center { text-align: center !important; }
.th-right { text-align: right !important; }
.td-center { text-align: center; }
.td-right { text-align: right; }

.section-list { display: flex; flex-direction: column; gap: 8px; }

.scan-entry {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  overflow: hidden;
}

.entry-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  text-align: left;
}
.entry-header:hover { background: #f9f9fb; }
.chevron { color: #aaa; font-size: 12px; }
.entry-icon { margin-right: 6px; }

.entry-body { padding: 0 0 12px; }
.entry-body table { width: 100%; border-collapse: collapse; font-size: 13px; }
.entry-body th { text-align: left; padding: 8px 20px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
.entry-body td { padding: 8px 20px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.entry-body tr:last-child td { border-bottom: none; }

.more-btn {
  width: 100%;
  padding: 13px;
  background: #fff;
  border: 1.5px dashed #ddd;
  border-radius: 12px;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  transition: all .15s;
}
.more-btn:hover { border-color: #aaa; color: #555; }

.empty { color: #aaa; padding: 12px 20px; font-size: 14px; }

@media (max-width: 768px) {
  h1 { font-size: 18px; margin-bottom: 4px; }

  .section table, .section thead, .section tbody, .section tr { display: block; }
  .section thead { display: none; }
  .section tr {
    background: #f9f9fb;
    border-radius: 10px;
    margin: 0 12px 8px;
    border: 1px solid #eee;
  }
  .section td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid #f0f0f0 !important;
    white-space: normal;
    font-size: 13px;
  }
  .section tr td:last-child { border-bottom: none !important; }
  .section td::before {
    color: #888;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    margin-right: 8px;
  }
  .pending-section td:nth-child(1)::before { content: '종목명'; }
  .pending-section td:nth-child(2)::before { content: '추세'; }
  .pending-section td:nth-child(3)::before { content: 'ADX'; }

  .entry-body table, .entry-body thead, .entry-body tbody, .entry-body tr { display: block; }
  .entry-body thead { display: none; }
  .entry-body tr {
    background: #f9f9fb;
    border-radius: 10px;
    margin: 0 12px 8px;
    border: 1px solid #eee;
  }
  .entry-body td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid #f0f0f0 !important;
    white-space: normal;
    font-size: 13px;
  }
  .entry-body tr td:last-child { border-bottom: none !important; }
  .entry-body td::before {
    color: #888;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    margin-right: 8px;
  }
  .entry-body td:nth-child(1)::before { content: '종목명'; }
  .entry-body td:nth-child(2)::before { content: '신호'; }
  .entry-body td:nth-child(3)::before { content: '추세'; }
  .entry-body td:nth-child(4)::before { content: 'ADX'; }
  .entry-body td:nth-child(5)::before { content: '현재가'; }
}
</style>
