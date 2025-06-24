import type {
  FC,
  ReactNode,
} from 'react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { debounce } from 'lodash-es'
import { useShallow } from 'zustand/react/shallow'
import type {
  ChatConfig,
  ChatItem,
  Feedback,
  OnRegenerate,
  OnSend,
} from '../types'
import type { ThemeBuilder } from '../embedded-chatbot/theme/theme-context'
import Question from './question'
import Answer from './answer'
import ChatInputArea from './chat-input-area'
import TryToAsk from './try-to-ask'
import { ChatContextProvider } from './context'
import type { InputForm } from './type'
import cn from '@/utils/classnames'
import type { Emoji } from '@/app/components/tools/types'
import Button from '@/app/components/base/button'
import { StopCircle } from '@/app/components/base/icons/src/vender/solid/mediaAndDevices'
import AgentLogModal from '@/app/components/base/agent-log-modal'
import PromptLogModal from '@/app/components/base/prompt-log-modal'
import { useStore as useAppStore } from '@/app/components/app/store'
import type { AppData } from '@/models/share'
import { loadApiConfig, buildEncryptUrl } from '@/utils/api-config'

export type ChatProps = {
  appData?: AppData
  chatList: ChatItem[]
  config?: ChatConfig
  isResponding?: boolean
  noStopResponding?: boolean
  onStopResponding?: () => void
  noChatInput?: boolean
  onSend?: OnSend
  inputs?: Record<string, any>
  inputsForm?: InputForm[]
  onRegenerate?: OnRegenerate
  chatContainerClassName?: string
  chatContainerInnerClassName?: string
  chatFooterClassName?: string
  chatFooterInnerClassName?: string
  suggestedQuestions?: string[]
  showPromptLog?: boolean
  questionIcon?: ReactNode
  answerIcon?: ReactNode
  allToolIcons?: Record<string, string | Emoji>
  onAnnotationEdited?: (question: string, answer: string, index: number) => void
  onAnnotationAdded?: (annotationId: string, authorName: string, question: string, answer: string, index: number) => void
  onAnnotationRemoved?: (index: number) => void
  chatNode?: ReactNode
  onFeedback?: (messageId: string, feedback: Feedback) => void
  chatAnswerContainerInner?: string
  hideProcessDetail?: boolean
  hideLogModal?: boolean
  themeBuilder?: ThemeBuilder
  switchSibling?: (siblingMessageId: string) => void
  showFeatureBar?: boolean
  showFileUpload?: boolean
  onFeatureBarClick?: (state: boolean) => void
  noSpacing?: boolean
  inputDisabled?: boolean
  isMobile?: boolean
  sidebarCollapseState?: boolean
  onLoginSuccess?: (userId: string) => void
  onInputsChange?: (inputs: Record<string, any>) => void
}

const Chat: FC<ChatProps> = ({
  appData,
  config,
  onSend,
  inputs,
  inputsForm,
  onRegenerate,
  chatList,
  isResponding,
  noStopResponding,
  onStopResponding,
  noChatInput,
  chatContainerClassName,
  chatContainerInnerClassName,
  chatFooterClassName,
  chatFooterInnerClassName,
  suggestedQuestions,
  showPromptLog,
  questionIcon,
  answerIcon,
  onAnnotationAdded,
  onAnnotationEdited,
  onAnnotationRemoved,
  chatNode,
  onFeedback,
  chatAnswerContainerInner,
  hideProcessDetail,
  hideLogModal,
  themeBuilder,
  switchSibling,
  showFeatureBar,
  showFileUpload,
  onFeatureBarClick,
  noSpacing,
  inputDisabled,
  isMobile,
  sidebarCollapseState,
  onLoginSuccess,
  onInputsChange,
}) => {
  const { t } = useTranslation()
  const { currentLogItem, setCurrentLogItem, showPromptLogModal, setShowPromptLogModal, showAgentLogModal, setShowAgentLogModal } = useAppStore(useShallow(state => ({
    currentLogItem: state.currentLogItem,
    setCurrentLogItem: state.setCurrentLogItem,
    showPromptLogModal: state.showPromptLogModal,
    setShowPromptLogModal: state.setShowPromptLogModal,
    showAgentLogModal: state.showAgentLogModal,
    setShowAgentLogModal: state.setShowAgentLogModal,
  })))
  const [width, setWidth] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatContainerInnerRef = useRef<HTMLDivElement>(null)
  const chatFooterRef = useRef<HTMLDivElement>(null)
  const chatFooterInnerRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  
  // 登录成功消息状态
  const [loginMessage, setLoginMessage] = useState<ChatItem | null>(null)
  // 用于防止重复初始化的标记
  const initializeAuthRef = useRef(false)
  // API配置状态
  const [apiConfig, setApiConfig] = useState<any>(null)
  
  // 按时间顺序合并chatList和登录消息
  const displayChatList = useMemo(() => {
    if (!loginMessage) return chatList
    
    // 如果没有现有对话，直接返回登录消息
    if (chatList.length === 0) return [loginMessage]
    
    console.log('=== 调试时间排序逻辑 ===')
    console.log('登录消息时间:', loginMessage.more?.time)
    
    // 找到正确的插入位置
    const loginTime = new Date(loginMessage.more?.time || Date.now()).getTime()
    let insertIndex = chatList.length // 默认插入到最后
    
    for (let i = 0; i < chatList.length; i++) {
      const item = chatList[i]
      let itemTime = 0
      
      // 尝试获取消息时间，支持多种时间格式
      if (item.more?.time) {
        itemTime = new Date(item.more.time).getTime()
      } else if (item.id) {
        // 如果没有时间戳，尝试从ID中提取时间
        const timeMatch = item.id.match(/(\d{13})/) // 匹配13位时间戳
        if (timeMatch) {
          itemTime = parseInt(timeMatch[1])
        }
      }
      
      console.log(`消息${i}: 时间=${itemTime}, ID=${item.id}, 内容=${item.content.substring(0, 30)}`)
      
      // 如果登录时间早于当前消息时间，插入在这里
      if (loginTime < itemTime) {
        insertIndex = i
        break
      }
    }
    
    console.log('插入位置:', insertIndex, '总长度:', chatList.length)
    
    // 在指定位置插入登录消息
    const result = [...chatList]
    result.splice(insertIndex, 0, loginMessage)
    return result
  }, [chatList, loginMessage])
  
  // 生成唯一ID的辅助函数
  const generateUniqueId = () => {
    return `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const handleScrollToBottom = useCallback(() => {
    if (displayChatList.length > 1 && chatContainerRef.current && !userScrolledRef.current)
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [displayChatList.length])

  const handleWindowResize = useCallback(() => {
    if (chatContainerRef.current)
      setWidth(document.body.clientWidth - (chatContainerRef.current?.clientWidth + 16) - 8)

    if (chatContainerRef.current && chatFooterRef.current)
      chatFooterRef.current.style.width = `${chatContainerRef.current.clientWidth}px`

    if (chatContainerInnerRef.current && chatFooterInnerRef.current)
      chatFooterInnerRef.current.style.width = `${chatContainerInnerRef.current.clientWidth}px`
  }, [])

  // 组件挂载时加载API配置
  useEffect(() => {
    const initConfig = async () => {
      try {
        const config = await loadApiConfig()
        setApiConfig(config)
      } catch (error) {
        console.error('Failed to initialize API config:', error)
      }
    }
    initConfig()
  }, [])

  // 初始化用户认证
  useEffect(() => {
    const initializeUserAuth = async () => {
      // 防止重复执行
      if (initializeAuthRef.current) {
        console.log('认证已初始化，跳过重复执行')
        return
      }
      
      // 检查是否是从空闲重置重定向而来
      const urlParams = new URLSearchParams(window.location.search)
      const resetParam = urlParams.get('reset')
      
      if (resetParam) {
        console.log('检测到重置参数，跳过用户认证流程')
        return
      }
      
      // 检查inputs是否存在且user_id为空，以及URL中是否包含token，并且API配置已加载
      if (inputs && !inputs.user_id && window.location.href.includes('token=') && apiConfig) {
        // 标记认证开始，防止重复执行
        initializeAuthRef.current = true
        
        inputs.current_url = inputs.current_url
        console.log('当前URL:', window.location.href)
        console.log('开始用户认证流程')

        try {
          // 解析URL中的token
          const tokenStr = window.location.href.split('token=')[1].split('sjtulibt')[0]
          // 使用qryType=2构建URL
          const url = buildEncryptUrl(apiConfig, tokenStr, '2')
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {}
          })
          
          const responseText = await response.text()
          console.log('API响应:', responseText)
          
          const responseData = JSON.parse(responseText)
          
          if (responseData.data) {
            // 注入用户信息到inputs
            inputs.user_id = responseData.data
            console.log('用户ID设置成功:', inputs.user_id)
            
            // 发送登录消息到后端保存
            if (onSend) {
              console.log('发送登录消息到后端保存')
              // 延迟发送，确保不与用户交互冲突
              setTimeout(() => {
                onSend(`【系统消息】 用户认证中，请稍后...`, [])
              }, 1000)
            }
            
            // 调用回调（如果有的话）
            if (onLoginSuccess) {
              onLoginSuccess(inputs.user_id)
            }
          } else {
            console.error('API返回数据异常:', responseData)
            // 重置标记允许重试
            initializeAuthRef.current = false
          }
        } catch (error) {
          console.error('用户认证API调用失败:', error)
          // 重置标记允许重试
          initializeAuthRef.current = false
        }
      } else {
        console.log('跳过认证：', {
          hasInputs: !!inputs,
          hasUserId: inputs?.user_id,
          hasToken: window.location.href.includes('token=')
        })
      }
    }

    // 只在组件初始化时执行一次
    initializeUserAuth()
  }, [apiConfig]) // 依赖apiConfig，当配置加载完成后执行

  useEffect(() => {
    handleScrollToBottom()
    handleWindowResize()
  }, [handleScrollToBottom, handleWindowResize])

  useEffect(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        handleScrollToBottom()
        handleWindowResize()
      })
    }
  })

  useEffect(() => {
    window.addEventListener('resize', debounce(handleWindowResize))
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [handleWindowResize])

  useEffect(() => {
    if (chatFooterRef.current && chatContainerRef.current) {
      // container padding bottom
      const resizeContainerObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { blockSize } = entry.borderBoxSize[0]
          chatContainerRef.current!.style.paddingBottom = `${blockSize}px`
          handleScrollToBottom()
        }
      })
      resizeContainerObserver.observe(chatFooterRef.current)

      // footer width
      const resizeFooterObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { inlineSize } = entry.borderBoxSize[0]
          chatFooterRef.current!.style.width = `${inlineSize}px`
        }
      })
      resizeFooterObserver.observe(chatContainerRef.current)

      return () => {
        resizeContainerObserver.disconnect()
        resizeFooterObserver.disconnect()
      }
    }
  }, [handleScrollToBottom])

  useEffect(() => {
    const chatContainer = chatContainerRef.current
    if (chatContainer) {
      const setUserScrolled = () => {
        // eslint-disable-next-line sonarjs/no-gratuitous-expressions
        if (chatContainer) // its in event callback, chatContainer may be null
          userScrolledRef.current = chatContainer.scrollHeight - chatContainer.scrollTop > chatContainer.clientHeight
      }
      chatContainer.addEventListener('scroll', setUserScrolled)
      return () => chatContainer.removeEventListener('scroll', setUserScrolled)
    }
  }, [])

  useEffect(() => {
    if (!sidebarCollapseState)
      setTimeout(() => handleWindowResize(), 200)
  }, [handleWindowResize, sidebarCollapseState])

  const hasTryToAsk = config?.suggested_questions_after_answer?.enabled && !!suggestedQuestions?.length && onSend

  return (
    <ChatContextProvider
      config={config}
      chatList={displayChatList}
      isResponding={isResponding}
      showPromptLog={showPromptLog}
      questionIcon={questionIcon}
      answerIcon={answerIcon}
      onSend={onSend}
      onRegenerate={onRegenerate}
      onAnnotationAdded={onAnnotationAdded}
      onAnnotationEdited={onAnnotationEdited}
      onAnnotationRemoved={onAnnotationRemoved}
      onFeedback={onFeedback}
    >
      <div className='relative h-full'>
        <div
          ref={chatContainerRef}
          className={cn('relative h-full overflow-y-auto overflow-x-hidden', chatContainerClassName)}
        >
          {chatNode}
          <div
            ref={chatContainerInnerRef}
            className={cn('w-full', !noSpacing && 'px-8', chatContainerInnerClassName)}
          >
            {
              displayChatList.map((item, index) => {
                if (item.isAnswer) {
                  const isLast = item.id === displayChatList[displayChatList.length - 1]?.id
                  return (
                    <Answer
                      appData={appData}
                      key={item.id}
                      item={item}
                      question={displayChatList[index - 1]?.content}
                      index={index}
                      config={config}
                      answerIcon={answerIcon}
                      responding={isLast && isResponding}
                      showPromptLog={showPromptLog}
                      chatAnswerContainerInner={chatAnswerContainerInner}
                      hideProcessDetail={hideProcessDetail}
                      noChatInput={noChatInput}
                      switchSibling={switchSibling}
                    />
                  )
                }
                return (
                  <Question
                    key={item.id}
                    item={item}
                    questionIcon={questionIcon}
                    theme={themeBuilder?.theme}
                    enableEdit={config?.questionEditEnable}
                    switchSibling={switchSibling}
                  />
                )
              })
            }
          </div>
        </div>
        <div
          className={`absolute bottom-0 flex justify-center bg-chat-input-mask ${(hasTryToAsk || !noChatInput || !noStopResponding) && chatFooterClassName}`}
          ref={chatFooterRef}
        >
          <div
            ref={chatFooterInnerRef}
            className={cn('relative', chatFooterInnerClassName)}
          >
            {
              !noStopResponding && isResponding && (
                <div className='mb-2 flex justify-center'>
                  <Button onClick={onStopResponding}>
                    <StopCircle className='mr-[5px] h-3.5 w-3.5 text-gray-500' />
                    <span className='text-xs font-normal text-gray-500'>{t('appDebug.operation.stopResponding')}</span>
                  </Button>
                </div>
              )
            }
            {
              hasTryToAsk && (
                <TryToAsk
                  suggestedQuestions={suggestedQuestions}
                  onSend={onSend}
                  isMobile={isMobile}
                />
              )
            }
            {
              !noChatInput && (
                <ChatInputArea
                  botName={appData?.site.title || 'Bot'}
                  disabled={inputDisabled}
                  showFeatureBar={showFeatureBar}
                  showFileUpload={showFileUpload}
                  featureBarDisabled={isResponding}
                  onFeatureBarClick={onFeatureBarClick}
                  visionConfig={config?.file_upload}
                  speechToTextConfig={config?.speech_to_text}
                  onSend={onSend}
                  inputs={inputs}
                  inputsForm={inputsForm}
                  theme={themeBuilder?.theme}
                  isResponding={isResponding}
                />
              )
            }
          </div>
        </div>
        {showPromptLogModal && !hideLogModal && (
          <PromptLogModal
            width={width}
            currentLogItem={currentLogItem}
            onCancel={() => {
              setCurrentLogItem()
              setShowPromptLogModal(false)
            }}
          />
        )}
        {showAgentLogModal && !hideLogModal && (
          <AgentLogModal
            width={width}
            currentLogItem={currentLogItem}
            onCancel={() => {
              setCurrentLogItem()
              setShowAgentLogModal(false)
            }}
          />
        )}
      </div>
    </ChatContextProvider>
  )
}

export default memo(Chat)
