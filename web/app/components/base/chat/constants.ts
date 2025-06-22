export const CONVERSATION_ID_INFO = 'conversationIdInfo'
export const UUID_NIL = '00000000-0000-0000-0000-000000000000'

// 空闲检测配置
export const IDLE_DETECTION_CONFIG = {
  // 总空闲超时时间（毫秒）
  TOTAL_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT || '45000', 10),
  // 警告倒计时时间（毫秒）
  WARNING_TIME: parseInt(process.env.NEXT_PUBLIC_IDLE_WARNING_TIME || '15000', 10),
  // 倒计时更新间隔（毫秒）
  COUNTDOWN_INTERVAL: 1000,
} as const

// 验证配置的合法性
if (IDLE_DETECTION_CONFIG.WARNING_TIME >= IDLE_DETECTION_CONFIG.TOTAL_TIMEOUT) {
  console.warn('Warning: IDLE_WARNING_TIME should be less than IDLE_TIMEOUT')
}

if (IDLE_DETECTION_CONFIG.TOTAL_TIMEOUT <= 0 || IDLE_DETECTION_CONFIG.WARNING_TIME <= 0) {
  console.warn('Warning: Idle detection times should be positive numbers')
}
