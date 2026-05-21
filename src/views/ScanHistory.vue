<template>
  <div>
    <h1>🔍 스캔 이력</h1>
    <p class="caption">매일 15:35 자동 스캔 · ADX 기준 전략 자동 선택</p>

    <div v-if="Object.keys(pending).length" class="section pending-section">
      <h2>⏳ 내일 매수 대기 중 ({{ Object.keys(pending).length }}종목)</h2>
      <table>
        <thead>
          <tr><th>코드</th><th>종목명</th><th>추세</th><th>ADX</th></tr>
        </thead>
        <tbody>
          <tr v-for="(v, code) in pending" :key="code">
            <td>{{ code }}</td>
            <td>{{ v.name }}</td>
            <td>{{ v.regime || '-' }}</td>
            <td>{{ v.adx != null ? v.adx.toFixed(1) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!scans.length" class="empty">스캔 이력 없음. 매일 15:35 자동 실행됩니다.</div>
    <div v-else class="section-list">
      <div v-for="entry in [...scans].reverse()" :key="entry.scanned_at" class="scan-entry">
        <button class="entry-header" @click="toggle(entry.scanned_at)">
          <span>📅 {{ entry.scanned_at }} — {{ entry.results.length }}종목</span>
          <span class="chevron">{{ open[entry.scanned_at] ? '▲' : '▼' }}</span>
        </button>
        <div v-if="open[entry.scanned_at]" class="entry-body">
          <div v-if="!entry.results.length" class="empty">조건 충족 종목 없음</div>
          <table v-else>
            <thead>
              <tr><th>코드</th><th>종목명</th><th>신호</th><th>추세</th><th>ADX</th><th>현재가</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in entry.results" :key="r.code">
                <td>{{ r.code }}</td>
                <td>{{ r.name }}</td>
                <td>{{ r.signal }}</td>
                <td>{{ r.regime }}</td>
                <td>{{ r.adx }}</td>
                <td>{{ r.price }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchScans, fetchPending } from '../api.js'

const scans = ref([])
const pending = ref({})
const open = ref({})

function toggle(key) {
  open.value[key] = !open.value[key]
}

onMounted(async () => {
  [scans.value, pending.value] = await Promise.all([fetchScans(), fetchPending()])
  if (scans.value.length) {
    open.value[scans.value[scans.value.length - 1].scanned_at] = true
  }
})
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.caption { color: #888; font-size: 13px; margin-bottom: 24px; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  margin-bottom: 16px;
}


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

.entry-body { padding: 0 20px 16px; }

table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #eee; color: #555; font-weight: 600; white-space: nowrap; }
td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
tr:last-child td { border-bottom: none; }

.empty { color: #aaa; padding: 12px 0; font-size: 14px; }

@media (max-width: 768px) {
  h1 { font-size: 18px; margin-bottom: 4px; }
  .section { padding: 14px 16px; overflow-x: visible; }
  .entry-body { padding: 0 14px 14px; overflow-x: visible; }
  .entry-header { padding: 12px 14px; font-size: 13px; }

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
  .section td:nth-child(1)::before { content: '코드'; }
  .section td:nth-child(2)::before { content: '종목명'; }
  .section td:nth-child(3)::before { content: '추세'; }
  .section td:nth-child(4)::before { content: 'ADX'; }
  .entry-body td:nth-child(1)::before { content: '코드'; }
  .entry-body td:nth-child(2)::before { content: '종목명'; }
  .entry-body td:nth-child(3)::before { content: '신호'; }
  .entry-body td:nth-child(4)::before { content: '추세'; }
  .entry-body td:nth-child(5)::before { content: 'ADX'; }
  .entry-body td:nth-child(6)::before { content: '현재가'; }
}
</style>
