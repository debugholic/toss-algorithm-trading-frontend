<template>
  <div>
    <h1>⚙️ 전략 현황</h1>
    <p class="caption" v-if="cfg">
      시장 국면(ADX+DI)에 따라 전략이 자동 선택됩니다 · 마지막 스캔: {{ lastScanDate }}
    </p>

    <div v-if="cfg" class="strategy-layout">

      <!-- 듀얼 모멘텀 게이트 (전체 너비) -->
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

      <!-- 4개 전략 2열 그리드 -->
      <div class="strategy-grid">

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

        <!-- 볼린저 밴드 반등 -->
        <div class="card">
          <div class="card-title">🔵 볼린저 밴드 반등 <span class="badge neutral">ADX 20~25</span></div>

          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>ADX 20~25 횡보/불명확 구간을 커버합니다. 방향성이 애매한 시장에서 볼린저 밴드 하단 터치 후 반등을 포착합니다. RSI보다 변동성 정보가 추가로 반영되어 진입 타이밍이 더 정교합니다.</p>
          </div>

          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> {{ cfg.bb_period }}일 이동평균 ± {{ cfg.bb_std }}σ 하단 터치 후 반등 확인</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> 볼린저 밴드 중간선({{ cfg.bb_period }}일 MA) 도달 시</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -5% 도달 시</div>
            </div>
          </div>

          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ bbCnt }}종목</div>
            </div>
          </div>
        </div>

        <!-- RSI 역발산 -->
        <div class="card">
          <div class="card-title">🟣 RSI 역발산 <span class="badge sideways">ADX &lt; 20</span></div>

          <div class="block">
            <div class="block-title">왜 이 전략?</div>
            <p>약한 횡보장(ADX &lt; 20)에서 RSI 과매도 구간의 반등을 노립니다. 방향성이 없는 시장에서 추세 전략은 잦은 손절을 유발하므로, 낙폭 과대 종목의 단기 반등이 유효합니다.</p>
          </div>

          <div class="block">
            <div class="block-title">매수 · 매도 흐름</div>
            <div class="flow">
              <div class="flow-item"><span class="tag buy">발굴</span> RSI ≤ {{ cfg.rsi_buy_threshold }} (과매도 구간 진입)</div>
              <div class="flow-item"><span class="tag buy">매수</span> ATR 범위 안에서 체결 확인 후 진입</div>
              <div class="flow-item"><span class="tag trail">익절</span> 최고 수익 +{{ cfg.trailing_activation }}% 후 최고점 대비 -{{ cfg.trailing_drop }}% 이탈 시</div>
              <div class="flow-item"><span class="tag sell">매도</span> RSI ≥ {{ cfg.rsi_sell_threshold }} 도달 시 전량 매도</div>
              <div class="flow-item"><span class="tag loss">손절</span> 매수가 대비 -5% 도달 시</div>
            </div>
          </div>

          <div class="metric-row">
            <div class="metric">
              <div class="label">마지막 스캔 발굴</div>
              <div class="value">{{ rsiCnt }}종목</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchConfig, fetchScans } from '../api.js'

const cfg = ref(null)
const maCnt = ref(0)
const rsiCnt = ref(0)
const bbCnt = ref(0)
const breakoutCnt = ref(0)
const lastScanDate = ref('-')

onMounted(async () => {
  const [config, scans] = await Promise.all([fetchConfig(), fetchScans()])
  cfg.value = config
  if (scans.length) {
    const last = scans[scans.length - 1]
    lastScanDate.value = last.scanned_at
    last.results.forEach(r => {
      const s = Array.isArray(r.strategy) ? r.strategy : [r.strategy || 'ma_cross']
      if (s.includes('ma_cross'))      maCnt.value++
      if (s.includes('rsi_reversal')) rsiCnt.value++
      if (s.includes('bb_reversal'))  bbCnt.value++
      if (s.includes('breakout_52w')) breakoutCnt.value++
    })
  }
})
</script>

<style scoped>
h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.caption { color: #888; font-size: 13px; margin-bottom: 24px; }

.strategy-layout { display: flex; flex-direction: column; gap: 20px; }
.strategy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

@media (max-width: 768px) {
  h1 { font-size: 18px; margin-bottom: 4px; }
  .strategy-grid { grid-template-columns: 1fr; }
  .card { padding: 16px; }
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

.gate-card { border-left: 4px solid #f59e0b; }

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
.block ul { padding-left: 18px; font-size: 14px; line-height: 1.8; color: #444; }

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
