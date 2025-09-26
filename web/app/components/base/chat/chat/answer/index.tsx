import type {
  FC,
  ReactNode,
} from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ChatConfig,
  ChatItem,
} from '../../types'
import Operation from './operation'
import AgentContent from './agent-content'
import BasicContent from './basic-content'
import SuggestedQuestions from './suggested-questions'
import More from './more'
import WorkflowProcessItem from './workflow-process'
import LoadingAnim from '@/app/components/base/chat/chat/loading-anim'
import Citation from '@/app/components/base/chat/chat/citation'
import { EditTitle } from '@/app/components/app/annotation/edit-annotation-modal/edit-item'
import type { AppData } from '@/models/share'
import AnswerIcon from '@/app/components/base/answer-icon'
import Modal from '@/app/components/base/modal'
import cn from '@/utils/classnames'
import { FileList } from '@/app/components/base/file-uploader'
import ContentSwitch from '../content-switch'

type AnswerProps = {
  item: ChatItem
  question: string
  index: number
  config?: ChatConfig
  answerIcon?: ReactNode
  responding?: boolean
  showPromptLog?: boolean
  chatAnswerContainerInner?: string
  hideProcessDetail?: boolean
  appData?: AppData
  noChatInput?: boolean
  switchSibling?: (siblingMessageId: string) => void
}
const Answer: FC<AnswerProps> = ({
  item,
  question,
  index,
  config,
  answerIcon,
  responding,
  showPromptLog,
  chatAnswerContainerInner,
  hideProcessDetail,
  appData,
  noChatInput,
  switchSibling,
}) => {
  const { t } = useTranslation()
  const {
    content,
    citation,
    agent_thoughts,
    more,
    annotation,
    workflowProcess,
    allFiles,
    message_files,
  } = item
  const hasAgentThoughts = !!agent_thoughts?.length

  const [containerWidth, setContainerWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const hasShownLoginModal = useRef(false)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  const getContainerWidth = () => {
    if (containerRef.current)
      setContainerWidth(containerRef.current?.clientWidth + 16)
  }
  useEffect(() => {
    getContainerWidth()
  }, [])

  const getContentWidth = () => {
    if (contentRef.current)
      setContentWidth(contentRef.current?.clientWidth)
  }

  useEffect(() => {
    if (!responding)
      getContentWidth()
  }, [responding])

  // 关闭弹窗的函数
  const closeLoginModal = () => {
    setIsLoginModalOpen(false)
    setCountdown(5)
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }

  // 启动倒计时
  const startCountdown = () => {
    setCountdown(5)
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束，自动关闭弹窗
          closeLoginModal()
          return 5
        }
        return prev - 1
      })
    }, 1000)
  }

  // 监听弹窗状态，启动或停止倒计时
  useEffect(() => {
    if (isLoginModalOpen) {
      startCountdown()
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
    
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [isLoginModalOpen])

  // 检测内容是否包含"登录地址"或"登录网址"
  const checkForLoginAddress = (content: string) => {
    return content && (content.includes('登录地址') || content.includes('登录网址'))
  }

  // 检测登录地址并显示弹窗 - 只在AI回答完成后检测
  useEffect(() => {
    // 避免重复显示弹窗
    if (hasShownLoginModal.current) return
    
    // 只在AI回答完成后进行检测（不是responding状态）
    if (responding) return
    
    // 确保有实际内容才检测
    const textContent = annotation?.logAnnotation?.content || content
    if (!textContent && (!agent_thoughts || agent_thoughts.length === 0)) return
    
    // 检测普通内容
    if (typeof textContent === 'string' && checkForLoginAddress(textContent)) {
      console.log('AI回答中检测到登录地址，显示弹窗')
      setIsLoginModalOpen(true)
      hasShownLoginModal.current = true
      return
    }
    
    // 检查agent_thoughts中的内容
    if (agent_thoughts) {
      for (const thought of agent_thoughts) {
        if (typeof thought.thought === 'string' && checkForLoginAddress(thought.thought)) {
          console.log('AI回答的思考过程中检测到登录地址，显示弹窗')
          setIsLoginModalOpen(true)
          hasShownLoginModal.current = true
          break
        }
      }
    }
  }, [content, annotation?.logAnnotation?.content, agent_thoughts, responding])

  // 重置弹窗状态（当开始新的回答时）
  useEffect(() => {
    if (responding) {
      hasShownLoginModal.current = false
    }
  }, [responding])

  // Recalculate contentWidth when content changes (e.g., SVG preview/source toggle)
  useEffect(() => {
    if (!containerRef.current)
      return
    const resizeObserver = new ResizeObserver(() => {
      getContentWidth()
    })
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleSwitchSibling = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev')
      item.prevSibling && switchSibling?.(item.prevSibling)
    else
      item.nextSibling && switchSibling?.(item.nextSibling)
  }, [switchSibling, item.prevSibling, item.nextSibling])

  return (
    <>
      <div className='mb-2 flex last:mb-0'>
        <div className='relative h-10 w-10 shrink-0'>
          {answerIcon || <AnswerIcon iconType="image" imageUrl="/logo/sjtu-site.png" />}
          {responding && (
            <div className='absolute left-[-3px] top-[-3px] flex h-4 w-4 items-center rounded-full border-[0.5px] border-divider-subtle bg-background-section-burn pl-[6px] shadow-xs'>
              <LoadingAnim type='avatar' />
            </div>
          )}
        </div>
        <div className='chat-answer-container group ml-4 w-0 grow pb-4' ref={containerRef}>
          <div className={cn('group relative pr-10', chatAnswerContainerInner)}>
            <div
              ref={contentRef}
              className={cn('body-lg-regular relative inline-block max-w-full rounded-2xl px-4 py-3 text-text-primary text-base', workflowProcess && 'w-full')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 165, 0, 0.2)',
                fontSize: '16px !important',
              }}
            >
              {
                !responding && (
                  <Operation
                    hasWorkflowProcess={!!workflowProcess}
                    maxSize={containerWidth - contentWidth - 4}
                    contentWidth={contentWidth}
                    item={item}
                    question={question}
                    index={index}
                    showPromptLog={showPromptLog}
                    noChatInput={noChatInput}
                  />
                )
              }
              {/** Render the normal steps */}
              {
                workflowProcess && !hideProcessDetail && (
                  <WorkflowProcessItem
                    data={workflowProcess}
                    item={item}
                    hideProcessDetail={hideProcessDetail}
                  />
                )
              }
              {/** Hide workflow steps by it's settings in siteInfo */}
              {
                workflowProcess && hideProcessDetail && appData && (
                  <WorkflowProcessItem
                    data={workflowProcess}
                    item={item}
                    hideProcessDetail={hideProcessDetail}
                    readonly={!appData.site.show_workflow_steps}
                  />
                )
              }
              {
                responding && !content && !hasAgentThoughts && (
                  <div className='flex h-5 w-6 items-center justify-center'>
                    <LoadingAnim type='text' />
                  </div>
                )
              }
              {
                content && !hasAgentThoughts && (
                  <BasicContent item={item} />
                )
              }
              {
                (hasAgentThoughts) && (
                  <AgentContent
                    item={item}
                    responding={responding}
                    content={content}
                  />
                )
              }
              {
                !!allFiles?.length && (
                  <FileList
                    className='my-1'
                    files={allFiles}
                    showDeleteAction={false}
                    showDownloadAction
                    canPreview
                  />
                )
              }
              {
                !!message_files?.length && (
                  <FileList
                    className='my-1'
                    files={message_files}
                    showDeleteAction={false}
                    showDownloadAction
                    canPreview
                  />
                )
              }
              {
                annotation?.id && annotation.authorName && (
                  <EditTitle
                    className='mt-1'
                    title={t('appAnnotation.editBy', { author: annotation.authorName })}
                  />
                )
              }
              <SuggestedQuestions item={item} />
              {
                !!citation?.length && !responding && (
                  <Citation data={citation} showHitInfo={config?.supportCitationHitInfo} />
                )
              }
              {
                item.siblingCount && item.siblingCount > 1 && item.siblingIndex !== undefined && (
                  <ContentSwitch
                    count={item.siblingCount}
                    currentIndex={item.siblingIndex}
                    prevDisabled={!item.prevSibling}
                    nextDisabled={!item.nextSibling}
                    switchSibling={handleSwitchSibling}
                  />
                )
              }
            </div>
          </div>
          <More more={more} />
        </div>
      </div>
      
      {/* 登录地址提示弹窗 */}
      <Modal
        isShow={isLoginModalOpen}
        onClose={closeLoginModal}
        title="登录提示"
        closable={true}
      >
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            在交我办登录页面可以通过交我办APP或微信扫码登录
          </p>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <span>弹窗将在</span>
              <span className="mx-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium">
                {countdown}
              </span>
              <span>秒后自动关闭</span>
            </div>
            <button
              onClick={closeLoginModal}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              我知道了
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default memo(Answer)
