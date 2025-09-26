import { useCallback, useEffect, useMemo, useState } from 'react'
import Chat from '../chat'
import type {
  ChatConfig,
  ChatItem,
  ChatItemInTree,
  OnSend,
} from '../types'
import { useChat } from '../chat/hooks'
import { getLastAnswer, isValidGeneratedAnswer } from '../utils'
import { useEmbeddedChatbotContext } from './context'
import { isDify } from './utils'
import { InputVarType } from '@/app/components/workflow/types'
import { TransferMethod } from '@/types/app'
import InputsForm from '@/app/components/base/chat/embedded-chatbot/inputs-form'
import {
  fetchSuggestedQuestions,
  getUrl,
  stopChatMessageResponding,
} from '@/service/share'
import AppIcon from '@/app/components/base/app-icon'
import LogoAvatar from '@/app/components/base/logo/logo-embedded-chat-avatar'
import AnswerIcon from '@/app/components/base/answer-icon'
import SuggestedQuestions from '@/app/components/base/chat/chat/answer/suggested-questions'
import { Markdown } from '@/app/components/base/markdown'
import cn from '@/utils/classnames'
import type { FileEntity } from '../../file-uploader/types'

const ChatWrapper = () => {
  const {
    appData,
    appParams,
    appPrevChatList,
    currentConversationId,
    currentConversationItem,
    currentConversationInputs,
    inputsForms,
    newConversationInputs,
    newConversationInputsRef,
    handleNewConversationCompleted,
    isMobile,
    isInstalledApp,
    appId,
    appMeta,
    handleFeedback,
    currentChatInstanceRef,
    themeBuilder,
    clearChatList,
    setClearChatList,
    setIsResponding,
    allInputsHidden,
  } = useEmbeddedChatbotContext()
  const appConfig = useMemo(() => {
    const config = appParams || {}

    return {
      ...config,
      file_upload: {
        ...(config as any).file_upload,
        fileUploadConfig: (config as any).system_parameters,
      },
      supportFeedback: true,
      opening_statement: currentConversationId ? currentConversationItem?.introduction : (config as any).opening_statement,
    } as ChatConfig
  }, [appParams, currentConversationItem?.introduction, currentConversationId])
  const {
    chatList,
    setTargetMessageId,
    handleSend,
    handleStop,
    isResponding: respondingState,
    suggestedQuestions,
  } = useChat(
    appConfig,
    {
      inputs: (currentConversationId ? currentConversationInputs : newConversationInputs) as any,
      inputsForm: inputsForms,
    },
    appPrevChatList,
    taskId => stopChatMessageResponding('', taskId, isInstalledApp, appId),
    clearChatList,
    setClearChatList,
  )
  const inputsFormValue = currentConversationId ? currentConversationInputs : newConversationInputsRef?.current
  const inputDisabled = useMemo(() => {
    if (allInputsHidden)
      return false

    let hasEmptyInput = ''
    let fileIsUploading = false
    const requiredVars = inputsForms.filter(({ required }) => required)
    if (requiredVars.length) {
      requiredVars.forEach(({ variable, label, type }) => {
        if (hasEmptyInput)
          return

        if (fileIsUploading)
          return

        if (!inputsFormValue?.[variable])
          hasEmptyInput = label as string

        if ((type === InputVarType.singleFile || type === InputVarType.multiFiles) && inputsFormValue?.[variable]) {
          const files = inputsFormValue[variable]
          if (Array.isArray(files))
            fileIsUploading = files.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)
          else
            fileIsUploading = files.transferMethod === TransferMethod.local_file && !files.uploadedId
        }
      })
    }
    if (hasEmptyInput)
      return true

    if (fileIsUploading)
      return true
    return false
  }, [inputsFormValue, inputsForms, allInputsHidden])

  useEffect(() => {
    if (currentChatInstanceRef.current)
      currentChatInstanceRef.current.handleStop = handleStop
  }, [currentChatInstanceRef, handleStop])
  useEffect(() => {
    setIsResponding(respondingState)
  }, [respondingState, setIsResponding])

  const doSend: OnSend = useCallback((message, files, isRegenerate = false, parentAnswer: ChatItem | null = null) => {
    const data: any = {
      query: message,
      files,
      inputs: currentConversationId ? currentConversationInputs : newConversationInputs,
      conversation_id: currentConversationId,
      parent_message_id: (isRegenerate ? parentAnswer?.id : getLastAnswer(chatList)?.id) || null,
    }

    handleSend(
      getUrl('chat-messages', isInstalledApp, appId || ''),
      data,
      {
        onGetSuggestedQuestions: responseItemId => fetchSuggestedQuestions(responseItemId, isInstalledApp, appId),
        onConversationComplete: currentConversationId ? undefined : handleNewConversationCompleted,
        isPublicAPI: !isInstalledApp,
      },
    )
  }, [currentConversationId, currentConversationInputs, newConversationInputs, chatList, handleSend, isInstalledApp, appId, handleNewConversationCompleted])

  const doRegenerate = useCallback((chatItem: ChatItemInTree, editedQuestion?: { message: string, files?: FileEntity[] }) => {
    const question = editedQuestion ? chatItem : chatList.find(item => item.id === chatItem.parentMessageId)!
    const parentAnswer = chatList.find(item => item.id === question.parentMessageId)
    doSend(editedQuestion ? editedQuestion.message : question.content,
      editedQuestion ? editedQuestion.files : question.message_files,
      true,
      isValidGeneratedAnswer(parentAnswer) ? parentAnswer : null,
    )
  }, [chatList, doSend])

  const messageList = useMemo(() => {
    if (currentConversationId)
      return chatList
    return chatList.filter(item => !item.isOpeningStatement)
  }, [chatList, currentConversationId])

  const [collapsed, setCollapsed] = useState(!!currentConversationId)

  const chatNode = useMemo(() => {
    if (allInputsHidden || !inputsForms.length)
      return null
    if (isMobile) {
      if (!currentConversationId)
        return <InputsForm collapsed={collapsed} setCollapsed={setCollapsed} />
      return <div className='mb-4'></div>
    }
    else {
      return <InputsForm collapsed={collapsed} setCollapsed={setCollapsed} />
    }
  }, [inputsForms.length, isMobile, currentConversationId, collapsed, allInputsHidden])

  const welcome = useMemo(() => {
    const welcomeMessage = chatList.find(item => item.isOpeningStatement)
    if (respondingState)
      return null
    if (currentConversationId)
      return null
    if (!welcomeMessage)
      return null
    if (!collapsed && inputsForms.length > 0 && !allInputsHidden)
      return null
    if (welcomeMessage.suggestedQuestions && welcomeMessage.suggestedQuestions?.length > 0) {
      return (
        <div className={cn('flex items-center justify-center px-4 py-12', isMobile ? 'min-h-[30vh] py-0' : 'h-[50vh]')}>
          <div className='flex max-w-[1000px] grow gap-8'>
            <AppIcon
              size='xxl'
              iconType='image'
              icon={appData?.site.icon}
              background={appData?.site.icon_background}
              imageUrl='/logo/sjtu-site.png'
              className="!w-20 !h-20"
            />
            <div 
              className='body-xl-regular grow rounded-2xl px-6 py-4 text-text-primary text-lg'
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 165, 0, 0.2)',
                fontSize: '18px !important',
              }}
            >
              <div 
                style={{ 
                  fontSize: '20px !important', 
                  fontWeight: '500 !important', 
                  lineHeight: '1.5 !important' 
                }} 
                className="text-xl font-medium"
              >
                <Markdown content={welcomeMessage.content} />
              </div>
              <SuggestedQuestions item={welcomeMessage} />
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className={cn('flex h-[50vh] flex-col items-center justify-center gap-6 py-12', isMobile ? 'min-h-[30vh] py-0' : 'h-[50vh]')}>
        <AppIcon
          size='xxl'
          iconType='image'
          icon={appData?.site.icon}
          background={appData?.site.icon_background}
          imageUrl='/logo/sjtu-site.png'
          className="!w-20 !h-20"
        />
        <div className='max-w-[1000px] px-16'>
          <div 
            style={{ 
              fontSize: '22px !important', 
              fontWeight: '500 !important', 
              lineHeight: '1.4 !important' 
            }} 
            className="text-2xl font-medium"
          >
            <Markdown className='!text-text-tertiary' content={welcomeMessage.content} />
          </div>
        </div>
      </div>
    )
  }, [appData?.site.icon, appData?.site.icon_background, appData?.site.icon_type, appData?.site.icon_url, chatList, collapsed, currentConversationId, inputsForms.length, respondingState, allInputsHidden])

  const answerIcon = isDify()
    ? <LogoAvatar className='relative shrink-0' />
    : (appData?.site && appData.site.use_icon_as_answer_icon)
      ? <AnswerIcon
        iconType='image'
        icon={appData.site.icon}
        background={appData.site.icon_background}
        imageUrl='/logo/sjtu-site.png'
      />
      : null

  return (
    <div
      className='relative h-full'
      style={{
        backgroundImage: 'url(/bg1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 背景遮罩层 */}
      <div className='absolute inset-0 bg-white/40'></div>
      
      {/* 右侧中间的jiaoxiaotuan.png图片 */}
      <div className='absolute right-8 top-[40%] transform -translate-y-1/2 z-10 opacity-90'>
        <img 
          src='/jiaoxiaotuan.png' 
          alt='交小團' 
          className='w-96 h-512 object-contain'
        />
      </div>
      
      {/* 主要聊天内容 */}
      <div className='relative z-20 h-full'>
        <Chat
          appData={appData}
          config={appConfig}
          chatList={messageList}
          isResponding={respondingState}
          chatContainerInnerClassName={cn('mx-auto w-full max-w-[1400px] pt-4 tablet:px-4', isMobile && 'px-4')}
          chatFooterClassName={cn('pb-4', !isMobile && 'rounded-b-2xl')}
          chatFooterInnerClassName={cn('mx-auto w-full max-w-[1400px] px-4', isMobile && 'px-2')}
          onSend={doSend}
          inputs={currentConversationId ? currentConversationInputs as any : newConversationInputs}
          inputsForm={inputsForms}
          onRegenerate={doRegenerate}
          onStopResponding={handleStop}
          chatNode={
            <>
              {chatNode}
              {welcome}
            </>
          }
          allToolIcons={appMeta?.tool_icons || {}}
          onFeedback={handleFeedback}
          suggestedQuestions={suggestedQuestions}
          answerIcon={answerIcon}
          hideProcessDetail
          themeBuilder={themeBuilder}
          switchSibling={siblingMessageId => setTargetMessageId(siblingMessageId)}
          inputDisabled={inputDisabled}
          isMobile={isMobile}
        />
      </div>
    </div>
  )
}

export default ChatWrapper
