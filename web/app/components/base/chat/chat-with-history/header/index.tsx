import { useCallback, useState, useEffect } from 'react'
import {
  RiEditBoxLine,
  RiLayoutRight2Line,
  RiResetLeftLine,
} from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import {
  useChatWithHistoryContext,
} from '../context'
import Operation from './operation'
import ActionButton, { ActionButtonState } from '@/app/components/base/action-button'
import AppIcon from '@/app/components/base/app-icon'
import Tooltip from '@/app/components/base/tooltip'
import ViewFormDropdown from '@/app/components/base/chat/chat-with-history/inputs-form/view-form-dropdown'
import Confirm from '@/app/components/base/confirm'
import RenameModal from '@/app/components/base/chat/chat-with-history/sidebar/rename-modal'
import type { ConversationItem } from '@/models/share'
import cn from '@/utils/classnames'

const Header = () => {
  const {
    appData,
    currentConversationId,
    currentConversationItem,
    inputsForms,
    pinnedConversationList,
    handlePinConversation,
    handleUnpinConversation,
    conversationRenaming,
    handleRenameConversation,
    handleDeleteConversation,
    handleNewConversation,
    sidebarCollapseState,
    handleSidebarCollapse,
    isResponding,
  } = useChatWithHistoryContext()
  const { t } = useTranslation()
  const isSidebarCollapsed = sidebarCollapseState

  const isPin = pinnedConversationList.some(item => item.id === currentConversationId)

  const [showConfirm, setShowConfirm] = useState<ConversationItem | null>(null)
  const [showRename, setShowRename] = useState<ConversationItem | null>(null)
  const handleOperate = useCallback((type: string) => {
    if (type === 'pin')
      handlePinConversation(currentConversationId)

    if (type === 'unpin')
      handleUnpinConversation(currentConversationId)

    if (type === 'delete')
      setShowConfirm(currentConversationItem as any)

    if (type === 'rename')
      setShowRename(currentConversationItem as any)
  }, [currentConversationId, currentConversationItem, handlePinConversation, handleUnpinConversation])
  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(null)
  }, [])
  const handleDelete = useCallback(() => {
    if (showConfirm)
      handleDeleteConversation(showConfirm.id, { onSuccess: handleCancelConfirm })
  }, [showConfirm, handleDeleteConversation, handleCancelConfirm])
  const handleCancelRename = useCallback(() => {
    setShowRename(null)
  }, [])
  const handleRename = useCallback((newName: string) => {
    if (showRename)
      handleRenameConversation(showRename.id, newName, { onSuccess: handleCancelRename })
  }, [showRename, handleRenameConversation, handleCancelRename])


  return (
    <>
      <div className='flex h-14 shrink-0 items-center p-3 w-full overflow-hidden'>
        <div className={cn('flex items-center gap-0.5 transition-all duration-200 ease-in-out flex-1 min-w-0 max-w-[calc(100%-100px)] overflow-hidden whitespace-nowrap', !isSidebarCollapsed && 'user-select-none opacity-0')}>
          <ActionButton className={cn(!isSidebarCollapsed && 'cursor-default', 'flex-shrink-0')} size='m' onClick={() => handleSidebarCollapse(false)}>
            <RiLayoutRight2Line className='h-[18px] w-[18px]' />
          </ActionButton>
          <div className='mr-0.5 shrink-0'>
            <AppIcon
              size='medium'
              iconType='image'
              icon={appData?.site.icon}
              background={appData?.site.icon_background}
              imageUrl='/logo/sjtu-site.png'
            />
          </div>
          {!currentConversationId && (
            <div className={cn('system-md-semibold flex-1 truncate text-text-secondary min-w-0')}>{appData?.site.title}</div>
          )}
          {currentConversationId && currentConversationItem && isSidebarCollapsed && (
            <>
              <div className='p-1 text-divider-deep flex-shrink-0'>/</div>
              <div className="flex-shrink-0 overflow-hidden">
                <Operation
                  title={appData?.site.title || ''}
                  // isPinned={!!isPin}
                  // togglePin={() => handleOperate(isPin ? 'unpin' : 'pin')}
                  isShowDelete
                  isShowRenameConversation
                  onRenameConversation={() => handleOperate('rename')}
                  onDelete={() => handleOperate('delete')}
                />
              </div>
            </>
          )}
          {/* <div className='flex items-center px-1'>
            <div className='h-[14px] w-px bg-divider-regular'></div>
          </div> */}
          {/* {isSidebarCollapsed && (
            <Tooltip
              disabled={!!currentConversationId}
              popupContent={t('share.chat.newChatTip')}
            >
              <div>
                <ActionButton
                  size='l'
                  state={(!currentConversationId || isResponding) ? ActionButtonState.Disabled : ActionButtonState.Default}
                  disabled={!currentConversationId || isResponding}
                  onClick={handleNewConversation}
                >
                  <RiEditBoxLine className='h-[18px] w-[18px]' />
                </ActionButton>
              </div>
            </Tooltip>
          )} */}
        </div>
        <div className='flex items-center gap-0.5 flex-shrink-0 overflow-hidden w-[100px] justify-end min-w-[100px]'>
          {/* 重置聊天按钮 - 始终显示 */}
          <Tooltip
            popupContent={t('share.chat.resetChat')}
          >
            <ActionButton 
              size='m' 
              onClick={handleNewConversation}
              className='flex-shrink-0'
            >
              <RiResetLeftLine className='h-[18px] w-[18px]' />
            </ActionButton>
          </Tooltip>
          
          {/* 表单下拉菜单 - 当有表单时显示 */}
          {inputsForms.length > 0 && (
            <div className='flex-shrink-0 overflow-hidden'>
              <ViewFormDropdown />
            </div>
          )}
        </div>
      </div>
      {!!showConfirm && (
        <Confirm
          title={t('share.chat.deleteConversation.title')}
          content={t('share.chat.deleteConversation.content') || ''}
          isShow
          onCancel={handleCancelConfirm}
          onConfirm={handleDelete}
        />
      )}
      {showRename && (
        <RenameModal
          isShow
          onClose={handleCancelRename}
          saveLoading={conversationRenaming}
          name={showRename?.name || ''}
          onSave={handleRename}
        />
      )}
    </>
  )
}

export default Header
