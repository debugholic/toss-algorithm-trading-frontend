<template>
  <div>
    <h1>⚙️ 전략 현황</h1>
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
              <span :class="['ver-badge', { active: v.version === versionPerf[versionPerf.length - 1]?.version }]">{{ v.version }}</span>
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
              <td>{{ STRATEGY_LABELS[row.strategy] }}</td>
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
            <span class="chip-name">{{ STRATEGY_LABELS[row.strategy] }}</span>
            <span v-if="row.trades" class="chip-stats">
              <span :class="pnlClass(row.winRate - 50)">승률 {{ row.winRate }}%</span>
              <span class="chip-sep">·</span>
              <span :class="pnlClass(row.totalPnl)">{{ formatPnl(row.totalPnl) }}원</span>
            </span>
            <span v-else class="chip-no-data">-</span>
          </div>
        </div>
      </div>

      <!-- 전략 카드: 듀얼 모멘텀 포함 (데스크탑 2열 / 모바일 스와이프) -->
      <div class="carousel-wrap">
      <div class="strategy-grid" ref="gridRef">

        <!-- 듀얼 모멘텀 게이트 (데스크탑: full-width, 모바일: 첫 번째 카드) -->
        <div class="card gate-card">
          <div class="card-title">🚦 듀얼 모멘텀 <span class="badge gate">시장 게이트</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>모든 전략의 최상위 관문입니다. KOSPI의 {{ cfg.lookback_52w }}거래일(약 1년) 수익률이 음수이면 시장 전체가 하락 중이라고 판단하고 스캔을 중단, 신규 매수를 전면 차단합니다. Gary Antonacci의 듀얼 모멘텀 이론 중 절대 모멘텀을 적용한 것입니다.</p>
          </div>
          <div class="block">
            <div class="block-title">동작 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">체크</span> KOSPI 현재가 vs {{ cfg.lookback_52w }}거래일 전 가격 비교</div>
              <div class="flow-item"><span class="tag sell">차단</span> 1년 수익률 음수 → 스캔 중단, 대기 매수 전면 취소</div>
              <div class="flow-item"><span class="tag trail">통과</span> 1년 수익률 양수 → 아래 전략 활성화</div>
            </div>
          </div>
        </div>

        <!-- MA 크로스 -->
        <div class="card">
          <div class="card-title">📈 MA 크로스 <span class="badge trend-up">ADX ≥ 25, +DI 우세</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>강한 상승추세에서 이동평균선 골든크로스를 포착합니다. ADX가 25 이상이고 +DI가 -DI보다 클 때 — 즉 방향이 위를 향한 추세장에서만 진입합니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> {{ cfg.short_ma }}일선이 {{ cfg.long_ma }}일선을 상향 돌파 (골든크로스)</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> 데드크로스 발생 즉시 전량 매도</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ maCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- 52주 신고가 돌파 -->
        <div class="card">
          <div class="card-title">🔴 52주 신고가 돌파 <span class="badge trend-up">ADX ≥ 25, +DI 우세</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>강한 상승추세에서 MA 크로스보다 더 강력한 모멘텀을 포착합니다. {{ cfg.lookback_52w }}거래일 신고가를 돌파한 종목은 저항선이 사라지고 추가 상승 모멘텀이 가장 강한 상태입니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> 오늘 종가가 {{ cfg.lookback_52w }}거래일 최고가를 돌파</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> 데드크로스 발생 시 전량 매도</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ breakoutCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- 눌림목 -->
        <div class="card">
          <div class="card-title">🔶 눌림목 <span class="badge pullback">상승추세 조정</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>상승추세(MA5 &gt; MA20) 중 주가가 MA20 부근으로 눌린 뒤 반등을 시작할 때 진입합니다. 거래량이 평균 이하로 줄어든 건강한 조정이어야 하며, 패닉셀과 구분됩니다. 추세가 살아있는 상태에서 최적의 진입 타이밍을 노립니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> MA5 &gt; MA20 유지 + 현재가 MA20~MA20×1.03 구간 + 거래량 평균 이하</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입 (갭업 0.5% 초과 시 보류)</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ pullbackCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- 조정구간 -->
        <div class="card">
          <div class="card-title">🟡 조정구간 <span class="badge pullback">횡보 에너지 축적</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>상승추세 중 5거래일 내 레인지 5% 이내로 좁게 횡보하며 에너지가 축적된 종목입니다. 거래량 감소가 동반될수록 폭발적인 돌파 가능성이 높아집니다. 레인지 상단 돌파 시점을 포착해 선제 진입합니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> MA5 &gt; MA20 + 현재가 MA20 위 + 5일 레인지 ≤5% + 거래량 20일 평균의 80% 이하</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 (레인지 상단 돌파 1% 이내만)</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ consolCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- RSI+BB 복합 -->
        <div class="card">
          <div class="card-title">🟣 RSI+BB 복합 <span class="badge sideways">강한 역추세</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>RSI 40 이하 과매도 + 볼린저 밴드 하단 반등을 동시에 충족해야 진입합니다. 단독 RSI보다 변동성 정보가 추가되어 신뢰도가 높고, 거래량 폭증 조건이 없어 조용한 반등 구간에서 유효합니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> RSI ≤ 40 + 전날 BB 하단 이하 → 오늘 BB 하단 위로 반등</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -5% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ rsiBBCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- v3 임박 신호: 골든크로스 임박 -->
        <div class="card">
          <div class="card-title">🟢⏳ 골든크로스 임박 <span class="badge pending">v3 선행 진입</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>MA5와 MA20의 격차가 1% 이내로 좁혀져 곧 골든크로스가 발생할 가능성이 높은 종목입니다. 메인 골든크로스 전략이 포착하지 못한 직전 구간에서 선제 진입합니다. 실제 골든크로스 발생 시 추가 수익 가능성이 있습니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> MA5 &lt; MA20 (아직 교차 전) + MA20 대비 격차 ≤ 1%</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> 데드크로스 발생 시 전량 매도</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ maPendingCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- v3 임박 신호: 52주 고가 임박 -->
        <div class="card">
          <div class="card-title">🔴⏳ 52주 고가 임박 <span class="badge pending">v3 선행 진입</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>현재가가 52주 최고가의 95% 이상으로 진입했지만 아직 신고가를 갱신하지 않은 종목입니다. 신고가 돌파 직전 저항선 바로 아래에서 선제 진입해 돌파 직후 모멘텀을 함께 탑니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> 52주 최고가 × 0.95 ≤ 현재가 &lt; 52주 최고가</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> 데드크로스 발생 시 전량 매도</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ breakoutPendingCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- v3 임박 신호: 거래량 증가 임박 -->
        <div class="card">
          <div class="card-title">🟠⏳ 거래량 증가 임박 <span class="badge pending">v3 선행 진입</span></div>
          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>5일 평균 거래량이 20일 평균의 1.3배 이상으로 증가하고 있으며, 최근 2일 연속 양봉을 기록한 종목입니다. 거래량 폭증 기준(1.5배)에 아직 못 미치지만 세력 유입 초기 신호로, 본격적인 모멘텀 전략 진입 전에 선행 포지션을 잡습니다.</p>
          </div>
          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> 5일 평균 거래량 ÷ 20일 평균 ∈ [1.3, 1.5) + 최근 2일 연속 양봉</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> 데드크로스 발생 시 전량 매도</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -7% 도달 시</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ volSurgePendingCnt }}종목</div>
            </div>
          </div>
        </div>

      </div>
      </div><!-- /.carousel-wrap -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { fetchConfig, fetchScans, fetchStrategyStats, fetchVersionPerformance } from '../api.js'

const STRATEGY_LABELS = {
  pullback:              '눌림목',
  consolidation:         '조정구간',
  rsi_bb_combo:          'RSI+BB 복합',
  breakout_52w:          '52주 신고가',
  ma_cross:              'MA 크로스',
  ma_cross_pending:      '골든크로스 임박',
  breakout_pending:      '52주 고가 임박',
  volume_surge_pending:  '거래량 증가 임박',
  // v1 레거시 (보유 종목 표기용, 신규 진입 없음)
  bb_reversal:           'BB 반등 (v1)',
  rsi_reversal:          'RSI 역발산 (v1)',
}

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

const versionPerf        = ref([])
const maCnt              = ref(0)
const breakoutCnt        = ref(0)
const pullbackCnt        = ref(0)
const consolCnt          = ref(0)
const rsiBBCnt           = ref(0)
const maPendingCnt       = ref(0)
const breakoutPendingCnt = ref(0)
const volSurgePendingCnt = ref(0)
const lastScanDate = ref('-')
const strategyStats = ref([])

function pnlClass(val) {
  if (val == null) return ''
  return val > 0 ? 'profit' : val < 0 ? 'loss' : ''
}

function formatPnl(val) {
  const sign = val >= 0 ? '+' : ''
  return sign + val.toLocaleString()
}

onMounted(async () => {
  const [config, scans, stats, verPerf] = await Promise.all([
    fetchConfig(), fetchScans(), fetchStrategyStats(), fetchVersionPerformance().catch(() => [])
  ])
  cfg.value = config
  strategyStats.value = stats
  versionPerf.value = verPerf

  if (scans.length) {
    const last = scans[0]
    lastScanDate.value = last.scanned_at.slice(0, 10) + ' ' + last.scanned_at.slice(11, 16)
    last.results.forEach(r => {
      const sig = r.signal ?? ''
      if      (sig.includes('눌림목'))              pullbackCnt.value++
      else if (sig.includes('조정구간'))             consolCnt.value++
      else if (sig.includes('RSI+BB'))              rsiBBCnt.value++
      else if (sig.includes('신고가') && !sig.includes('임박')) breakoutCnt.value++
      else if (sig.includes('골든크로스') && !sig.includes('임박')) maCnt.value++
      else if (sig.includes('골든크로스 임박'))        maPendingCnt.value++
      else if (sig.includes('고가 임박'))              breakoutPendingCnt.value++
      else if (sig.includes('연속 양봉'))              volSurgePendingCnt.value++
    })
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
.ver-badge { font-size: 11px; font-weight: 800; color: #aaa; background: #f0f0f0; border-radius: 4px; padding: 1px 6px; flex-shrink: 0; }
.ver-badge.active { background: #1a1a2e; color: #fff; }
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
</style>
