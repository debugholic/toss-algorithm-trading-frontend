// 전략 표시명 — 백엔드 strategy.py 의 name(= strategies 테이블)과 같게. 화면마다 따로 두지 말고 여기서만 관리
export const STRATEGY_NAMES = {
  pullback:             '눌림목',
  consolidation:        '조정구간',
  rsi_bb_combo:         'RSI+BB 복합',
  ma_cross_pending:     '골든크로스 임박',
  breakout_pending:     '52주 고가 임박',
  volume_surge_pending: '거래량 증가 임박',
  buyback:              '자사주 매입 공시',
  // 퇴출된 예전 전략 — 과거 거래 표시용
  ma_cross:             'MA 크로스',
  breakout_52w:         '52주 신고가',
  rsi_reversal:         'RSI 역발산',
  bb_reversal:          'BB 반등',
}
