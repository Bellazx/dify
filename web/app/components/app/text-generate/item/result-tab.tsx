import {
  memo,
  useEffect,
  useState,
} from 'react'
import { Markdown } from '@/app/components/base/markdown'
import Modal from '@/app/components/base/modal'
import CodeEditor from '@/app/components/workflow/nodes/_base/components/editor/code-editor'
import { CodeLanguage } from '@/app/components/workflow/nodes/code/types'
import type { WorkflowProcess } from '@/app/components/base/chat/types'
import { FileList } from '@/app/components/base/file-uploader'

const ResultTab = ({
  data,
  content,
  currentTab,
}: {
  data?: WorkflowProcess
  content: any
  currentTab: string
}) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // 检测内容是否包含"登录地址"或"登录网址"
  const checkForLoginAddress = (content: string) => {
    return content && (content.includes('登录地址') || content.includes('登录网址'))
  }

  // 当内容改变时检查是否包含"登录地址"或"登录网址"
  useEffect(() => {
    if (data?.resultText && checkForLoginAddress(data.resultText)) {
      setIsLoginModalOpen(true)
    }
  }, [data?.resultText])

  return (
    <>
      {currentTab === 'RESULT' && (
        <div className='space-y-3 p-4'>
          {data?.resultText && <Markdown content={data?.resultText || ''} />}
          {!!data?.files?.length && (
            <div className='flex flex-col gap-2'>
              {data?.files.map((item: any) => (
                <div key={item.varName} className='system-xs-regular flex flex-col gap-1'>
                  <div className='py-1 text-text-tertiary '>{item.varName}</div>
                  <FileList
                    files={item.list}
                    showDeleteAction={false}
                    showDownloadAction
                    canPreview
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {currentTab === 'DETAIL' && content && (
        <div className='p-4'>
          <CodeEditor
            readOnly
            title={<div>JSON OUTPUT</div>}
            language={CodeLanguage.json}
            value={content}
            isJSONStringifyBeauty
          />
        </div>
      )}
      
      {/* 登录地址提示弹窗 */}
      <Modal
        isShow={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="登录提示"
        closable={true}
      >
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            在交我办登录页面可以通过交我办APP或微信扫码登录
          </p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsLoginModalOpen(false)}
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

export default memo(ResultTab)
