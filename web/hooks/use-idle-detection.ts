import { useCallback, useEffect, useRef, useState } from 'react'
import { IDLE_DETECTION_CONFIG } from '@/app/components/base/chat/constants'

export interface UseIdleDetectionOptions {
  timeout: number // 空闲时间阈值（毫秒）
  onIdle: () => void // 空闲时的回调函数
  enabled?: boolean // 是否启用空闲检测
  warningTime?: number // 显示警告的时间（毫秒，从倒计时开始）
}

export const useIdleDetection = ({ timeout, onIdle, enabled = true, warningTime = 15000 }: UseIdleDetectionOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const onIdleRef = useRef(onIdle)
  
  const [isShowingWarning, setIsShowingWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  // 更新回调函数引用
  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  // 开始倒计时显示
  const startCountdown = useCallback(() => {
    setIsShowingWarning(true)
    setRemainingTime(warningTime)
    
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= IDLE_DETECTION_CONFIG.COUNTDOWN_INTERVAL) {
          return 0
        }
        return prev - IDLE_DETECTION_CONFIG.COUNTDOWN_INTERVAL
      })
    }, IDLE_DETECTION_CONFIG.COUNTDOWN_INTERVAL)
  }, [warningTime])

  // 停止倒计时显示
  const stopCountdown = useCallback(() => {
    setIsShowingWarning(false)
    setRemainingTime(0)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  // 重置空闲计时器
  const resetTimer = useCallback(() => {
    if (!enabled) return
    
    // 清除所有现有的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    
    // 停止倒计时显示
    stopCountdown()
    
    // 设置警告倒计时定时器
    warningTimeoutRef.current = setTimeout(() => {
      startCountdown()
    }, timeout - warningTime)
    
    // 设置最终空闲超时定时器
    timeoutRef.current = setTimeout(() => {
      onIdleRef.current()
      stopCountdown()
    }, timeout)
  }, [timeout, enabled, warningTime, startCountdown, stopCountdown])

  // 停止空闲检测
  const stopTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
    stopCountdown()
  }, [stopCountdown])

  useEffect(() => {
    if (!enabled) {
      stopTimer()
      return
    }

    // 监听的事件类型
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'input'
    ]

    // 事件处理函数
    const handleActivity = () => {
      resetTimer()
    }

    // 添加事件监听器
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // 初始化计时器
    resetTimer()

    // 清理函数
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      stopTimer()
    }
  }, [enabled, resetTimer, stopTimer])

  return { 
    resetTimer, 
    stopTimer,
    isShowingWarning,
    remainingTime: Math.ceil(remainingTime / IDLE_DETECTION_CONFIG.COUNTDOWN_INTERVAL) // 转换为秒
  }
} 