<template>
  <div>
    <h1>⚙️ 전략 현황</h1>
    <p class="caption" v-if="cfg">
      시장 국면(ADX+DI)에 따라 전략이 자동 선택됩니다 · 마지막 스캔: {{ lastScanDate }}
    </p>

    <div v-if="cfg" class="strategy-layout">

      <!-- 전략별 성과 테이블 -->
      <div class="perf-section">
        <div class="section-title">전략별 성과</div>
        <div class="perf-table-wrap">
          <table class="perf-table">
            <thead>
              <tr>
                <th>전략</th>
                <th>거래수</th>
                <th>승률</th>
                <th>평균수익률</th>
                <th>총손익</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in strategyRows" :key="s.key">
                <td class="strategy-name">{{ s.label }}</td>
                <td>{{ s.trades > 0 ? s.trades : '-' }}</td>
                <td>{{ s.trades > 0 ? s.winRate : '-' }}</td>
                <td :class="s.trades > 0 ? pnlClass(s.avgPnlPct) : ''">
                  {{ s.trades > 0 ? s.avgPnlPct : '-' }}
                </td>
                <td :class="s.trades > 0 ? pnlClass(s.totalPnl) : ''">
                  {{ s.trades > 0 ? s.totalPnlFormatted : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 전략 카드: 모바일=스와이프, 데스크탑=그리드 -->
      <div class="cards-wrapper">

        <!-- 모바일 스와이프 -->
        <div class="swipe-container" ref="track" @touchstart="onTouchStart" @touchend="onTouchEnd">
          <div
            class="swipe-track"
            :style="trackStyle"
            @transitionend="onTransitionEnd"
          >
            <div v-for="(card, i) in clonedCards" :key="i" class="swipe-card">
              <component :is="card.component" :cfg="cfg" :count="card.count" />
            </div>
          </div>
          <div class="swipe-dots">
            <span
              v-for="(card, i) in cards"
              :key="i"
              class="dot"
              :class="{ active: i === realIndex }"
              @click="goTo(i)"
            />
          </div>
        </div>

        <!-- 데스크탑 그리드 -->
        <div class="strategy-grid desktop-only">
          <CardDualMomentum :cfg="cfg" />
          <CardMaCross :cfg="cfg" :count="maCnt" />
          <CardBreakout :cfg="cfg" :count="breakoutCnt" />
          <CardBB :cfg="cfg" :count="bbCnt" />
          <CardRSI :cfg="cfg" :count="rsiCnt" />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { fetchConfig, fetchScans, fetchStrategyStats } from '../api.js'

// ── 데이터 ──────────────────────────────────────────────────────────────
const cfg          = ref(null)
const maCnt        = ref(0)
const rsiCnt       = ref(0)
const bbCnt        = ref(0)
const breakoutCnt  = ref(0)
const lastScanDate = ref('-')
const stats        = ref({})

onMounted(async () => {
  const [config, scans, stratStats] = await Promise.all([
    fetchConfig(), fetchScans(), fetchStrategyStats()
  ])
  cfg.value   = config
  stats.value = stratStats

  if (scans.length) {
    const last = scans[scans.length - 1]
    lastScanDate.value = last.scanned_at
    last.results.forEach(r => {
      const s = Array.isArray(r.strategy) ? r.strategy : [r.strategy || 'ma_cross']
      if (s.includes('ma_cross'))      maCnt.value++
      if (s.includes('rsi_reversal'))  rsiCnt.value++
      if (s.includes('bb_reversal'))   bbCnt.value++
      if (s.includes('breakout_52w'))  breakoutCnt.value++
    })
  }
})

// ── 성과 테이블 ──────────────────────────────────────────────────────────
const STRATEGY_LABELS = {
  ma_cross:     'MA 크로스',
  breakout_52w: '52주 신고가',
  bb_reversal:  'BB 반등',
  rsi_reversal: 'RSI 역발산',
}

const strategyRows = computed(() =>
  Object.entries(STRATEGY_LABELS).map(([key, label]) => {
    const s = stats.value[key] ?? { trades: 0, wins: 0, totalPnl: 0, totalPnlPct: 0 }
    const avgPnlPct = s.trades > 0 ? s.totalPnlPct / s.trades : 0
    return {
      key,
      label,
      trades: s.trades,
      winRate: s.trades > 0 ? `${Math.round((s.wins / s.trades) * 100)}%` : '-',
      avgPnlPct: s.trades > 0 ? `${avgPnlPct >= 0 ? '+' : ''}${avgPnlPct.toFixed(1)}%` : '-',
      totalPnl: s.totalPnl,
      totalPnlFormatted: s.trades > 0
        ? `${s.totalPnl >= 0 ? '+' : ''}${Math.round(s.totalPnl).toLocaleString()}`
        : '-',
    }
  })
)

function pnlClass(val) {
  if (typeof val === 'string') val = parseFloat(val)
  return val > 0 ? 'pos' : val < 0 ? 'neg' : ''
}

// ── 카드 컴포넌트 정의 ────────────────────────────────────────────────────
const CardDualMomentum = defineComponent({
  props: ['cfg'],
  setup(props) {
    return () => h('div', { class: 'card gate-card' }, [
      h('div', { class: 'card-title' }, [
        '🚦 듀얼 모멘텀 ',
        h('span', { class: 'badge gate' }, '시장 게이트'),
      ]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '왜 이 전략?'),
        h('p', `모든 전략의 최상위 관문입니다. KOSPI의 ${props.cfg?.lookback_52w}거래일(약 1년) 수익률이 음수이면 시장 전체가 하락 중이라고 판단하고 스캔을 중단, 신규 매수를 전면 차단합니다. Gary Antonacci의 듀얼 모멘텀 이론 중 절대 모멘텀을 적용한 것입니다.`),
      ]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '동작 흐름'),
        h('div', { class: 'flow' }, [
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '체크'), ` KOSPI 현재가 vs ${props.cfg?.lookback_52w}거래일 전 가격 비교`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag sell' }, '차단'), ' 1년 수익률 음수 → 스캔 중단, 대기 매수 전면 취소']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag trail' }, '통과'), ' 1년 수익률 양수 → 아래 전략 활성화']),
        ]),
      ]),
    ])
  },
})

const CardMaCross = defineComponent({
  props: ['cfg', 'count'],
  setup(props) {
    return () => h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, ['📈 MA 크로스 ', h('span', { class: 'badge trend-up' }, 'ADX ≥ 25, +DI 우세')]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '왜 이 전략?'),
        h('p', `강한 상승추세에서 이동평균선 골든크로스를 포착합니다. ADX가 25 이상이고 +DI가 -DI보다 클 때 — 즉 방향이 위를 향한 추세장에서만 진입합니다.`),
      ]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '매수 · 매도 흐름'),
        h('div', { class: 'flow' }, [
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '발굴'), ` ${props.cfg?.short_ma}일선이 ${props.cfg?.long_ma}일선을 상향 돌파 (골든크로스)`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '매수'), ' ATR 범위 안에서 체결 확인 후 진입']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag trail' }, '익절'), ` 최고 수익 +${props.cfg?.trailing_activation}% 후 최고점 대비 -${props.cfg?.trailing_drop}% 이탈 시`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag sell' }, '매도'), ' 데드크로스 발생 즉시 전량 매도']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag loss' }, '손절'), ' 매수가 대비 -7% 도달 시']),
        ]),
      ]),
      h('div', { class: 'metric-row' }, [
        h('div', { class: 'metric' }, [
          h('div', { class: 'label' }, '마지막 스캔 발굴'),
          h('div', { class: 'value' }, `${props.count}종목`),
        ]),
      ]),
    ])
  },
})

const CardBreakout = defineComponent({
  props: ['cfg', 'count'],
  setup(props) {
    return () => h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, ['🔴 52주 신고가 돌파 ', h('span', { class: 'badge trend-up' }, 'ADX ≥ 25, +DI 우세')]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '왜 이 전략?'),
        h('p', `강한 상승추세에서 MA 크로스보다 더 강력한 모멘텀을 포착합니다. ${props.cfg?.lookback_52w}거래일 신고가를 돌파한 종목은 저항선이 사라지고 추가 상승 모멘텀이 가장 강한 상태입니다.`),
      ]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '매수 · 매도 흐름'),
        h('div', { class: 'flow' }, [
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '발굴'), ` 오늘 종가가 ${props.cfg?.lookback_52w}거래일 최고가를 돌파`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '매수'), ' ATR 범위 안에서 체결 확인 후 진입']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag trail' }, '익절'), ` 최고 수익 +${props.cfg?.trailing_activation}% 후 최고점 대비 -${props.cfg?.trailing_drop}% 이탈 시`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag sell' }, '매도'), ' 데드크로스 발생 시 전량 매도']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag loss' }, '손절'), ' 매수가 대비 -7% 도달 시']),
        ]),
      ]),
      h('div', { class: 'metric-row' }, [
        h('div', { class: 'metric' }, [
          h('div', { class: 'label' }, '마지막 스캔 발굴'),
          h('div', { class: 'value' }, `${props.count}종목`),
        ]),
      ]),
    ])
  },
})

const CardBB = defineComponent({
  props: ['cfg', 'count'],
  setup(props) {
    return () => h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, ['🔵 볼린저 밴드 반등 ', h('span', { class: 'badge neutral' }, 'ADX 20~25')]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '왜 이 전략?'),
        h('p', `ADX 20~25 횡보/불명확 구간을 커버합니다. 방향성이 애매한 시장에서 볼린저 밴드 하단 터치 후 반등을 포착합니다. RSI보다 변동성 정보가 추가로 반영되어 진입 타이밍이 더 정교합니다.`),
      ]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '매수 · 매도 흐름'),
        h('div', { class: 'flow' }, [
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '발굴'), ` ${props.cfg?.bb_period}일 이동평균 ± ${props.cfg?.bb_std}σ 하단 터치 후 반등 확인`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '매수'), ' ATR 범위 안에서 체결 확인 후 진입']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag trail' }, '익절'), ` 최고 수익 +${props.cfg?.trailing_activation}% 후 최고점 대비 -${props.cfg?.trailing_drop}% 이탈 시`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag sell' }, '매도'), ` 볼린저 밴드 중간선(${props.cfg?.bb_period}일 MA) 도달 시`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag loss' }, '손절'), ' 매수가 대비 -5% 도달 시']),
        ]),
      ]),
      h('div', { class: 'metric-row' }, [
        h('div', { class: 'metric' }, [
          h('div', { class: 'label' }, '마지막 스캔 발굴'),
          h('div', { class: 'value' }, `${props.count}종목`),
        ]),
      ]),
    ])
  },
})

const CardRSI = defineComponent({
  props: ['cfg', 'count'],
  setup(props) {
    return () => h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, ['🟣 RSI 역발산 ', h('span', { class: 'badge sideways' }, 'ADX < 20')]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '왜 이 전략?'),
        h('p', `약한 횡보장(ADX < 20)에서 RSI 과매도 구간의 반등을 노립니다. 방향성이 없는 시장에서 추세 전략은 잦은 손절을 유발하므로, 낙폭 과대 종목의 단기 반등이 유효합니다.`),
      ]),
      h('div', { class: 'block' }, [
        h('div', { class: 'block-title' }, '매수 · 매도 흐름'),
        h('div', { class: 'flow' }, [
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '발굴'), ` RSI ≤ ${props.cfg?.rsi_buy_threshold} (과매도 구간 진입)`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag buy' }, '매수'), ' ATR 범위 안에서 체결 확인 후 진입']),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag trail' }, '익절'), ` 최고 수익 +${props.cfg?.trailing_activation}% 후 최고점 대비 -${props.cfg?.trailing_drop}% 이탈 시`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag sell' }, '매도'), ` RSI ≥ ${props.cfg?.rsi_sell_threshold} 도달 시 전량 매도`]),
          h('div', { class: 'flow-item' }, [h('span', { class: 'tag loss' }, '손절'), ' 매수가 대비 -5% 도달 시']),
        ]),
      ]),
      h('div', { class: 'metric-row' }, [
        h('div', { class: 'metric' }, [
          h('div', { class: 'label' }, '마지막 스캔 발굴'),
          h('div', { class: 'value' }, `${props.count}종목`),
        ]),
      ]),
    ])
  },
})

// ── 스와이프 캐러셀 ──────────────────────────────────────────────────────
const cards = computed(() => [
  { component: CardDualMomentum, count: 0 },
  { component: CardMaCross,      count: maCnt.value },
  { component: CardBreakout,     count: breakoutCnt.value },
  { component: CardBB,           count: bbCnt.value },
  { component: CardRSI,          count: rsiCnt.value },
])

// 클론 트릭: [마지막 클론, ...실제카드, 첫번째 클론]
const clonedCards = computed(() => {
  const c = cards.value
  if (!c.length) return c
  return [c[c.length - 1], ...c, c[0]]
})

// 실제 인덱스 (클론 오프셋 제거)
const currentIndex = ref(1) // clonedCards 기준, 1이 실제 첫번째
const isAnimating  = ref(false)

const realIndex = computed(() => {
  const n = cards.value.length
  if (n === 0) return 0
  return ((currentIndex.value - 1) + n) % n
})

const trackStyle = computed(() => ({
  transform: `translateX(${-currentIndex.value * 100}%)`,
  transition: isAnimating.value ? 'transform 0.3s ease' : 'none',
}))

function goTo(realIdx) {
  isAnimating.value = true
  currentIndex.value = realIdx + 1
}

function onTransitionEnd() {
  const n = cards.value.length
  if (currentIndex.value === 0) {
    isAnimating.value = false
    currentIndex.value = n
  } else if (currentIndex.value === n + 1) {
    isAnimating.value = false
    currentIndex.value = 1
  } else {
    isAnimating.value = false
  }
}

// 터치 스와이프
const touchStartX = ref(0)
function onTouchStart(e) {
  touchStartX.value = e.touches[0].clientX
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX.value
  if (Math.abs(dx) < 30) return
  isAnimating.value = true
  if (dx < 0) currentIndex.value++
  else        currentIndex.value--
}
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.caption { color: #888; font-size: 13px; margin-bottom: 24px; }
.strategy-layout { display: flex; flex-direction: column; gap: 24px; }

/* ── 성과 테이블 ── */
.perf-section {}
.section-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #1a1a2e; }
.perf-table-wrap { overflow-x: auto; }
.perf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.perf-table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.perf-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f8f8f8;
  white-space: nowrap;
}
.strategy-name { font-weight: 600; color: #1a1a2e; }
.pos { color: #dc2626; font-weight: 600; }
.neg { color: #1d4ed8; font-weight: 600; }

/* ── 스와이프 (모바일만) ── */
.swipe-container { display: none; overflow: hidden; position: relative; }
.swipe-track { display: flex; width: 100%; }
.swipe-card { flex: 0 0 100%; width: 100%; }
.swipe-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e0e0e0;
  cursor: pointer;
  transition: background 0.2s;
}
.dot.active { background: #1a1a2e; }

/* ── 데스크탑 그리드 ── */
.strategy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.desktop-only { display: grid; }

.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.gate-card { grid-column: 1 / -1; }

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
.metric .label { font-size: 13px; color: #888; margin-bottom: 4px; }
.metric .value { font-size: 24px; font-weight: 700; color: #1a1a2e; }

/* ── 모바일 ── */
@media (max-width: 768px) {
  h1 { font-size: 18px; margin-bottom: 4px; }
  .swipe-container { display: block; }
  .desktop-only { display: none; }
  .card { padding: 16px; }
  .card-title { font-size: 16px; }
}
</style>
