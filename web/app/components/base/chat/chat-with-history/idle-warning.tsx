'use client'
import { useTranslation } from 'react-i18next'
import { useChatWithHistoryContext } from './context'
import { AlertTriangle } from '@/app/components/base/icons/src/vender/line/alertsAndFeedback'
import cn from '@/utils/classnames'

const IdleWarning = () => {
  const { t } = useTranslation()
  const { isShowingIdleWarning, idleRemainingTime } = useChatWithHistoryContext()

  if (!isShowingIdleWarning || idleRemainingTime <= 0) {
    return null
  }

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform',
      'flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-6 py-4 shadow-xl',
      'min-w-80 max-w-md w-auto',
      'animate-pulse'
    )}>
      <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0" />
      <div className="flex flex-col flex-grow">
        <div className="text-base font-semibold text-orange-800 mb-1">
          {t('common.chat.idleWarning.title')}
        </div>
        <div className="text-sm text-orange-600">
          {t('common.chat.idleWarning.message', { seconds: idleRemainingTime })}
        </div>
      </div>
    </div>
  )
}

export default IdleWarning 