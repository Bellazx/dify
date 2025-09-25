/**
 * @fileoverview Link component for rendering <a> tags in Markdown.
 * Extracted from the main markdown renderer for modularity.
 * Handles special rendering for "abbr:" type links for interactive chat actions.
 */
import React from 'react'
import { useChatContext } from '@/app/components/base/chat/chat/context'
import { isValidUrl } from './utils'

const Link = ({ node, children, ...props }: any) => {
  const { onSend } = useChatContext()
  if (node.properties?.href && node.properties.href?.toString().startsWith('abbr')) {
    const hidden_text = decodeURIComponent(node.properties.href.toString().split('abbr:')[1])

    return <abbr className="cursor-pointer underline !decoration-blue-800 decoration-dashed text-blue-800 font-medium" onClick={() => onSend?.(hidden_text)} title={node.children[0]?.value || ''}>{node.children[0]?.value || ''}</abbr>
  }
  else {
    const href = props.href || node.properties?.href
    if(!isValidUrl(href))
      return <span>{children}</span>

    // 检查链接是否包含10.119.4.239，如果是则在当前窗口打开，否则在新窗口打开
    const shouldOpenInNewWindow = !href.includes('10.119.4.239')
    
    return (
      <a 
        href={href} 
        target={shouldOpenInNewWindow ? "_blank" : undefined}
        rel={shouldOpenInNewWindow ? "noopener noreferrer" : undefined}
        className="cursor-pointer underline !decoration-blue-800 decoration-dashed text-blue-800 font-medium"
      >
        {children || 'Download'}
      </a>
    )
  }
}

export default Link
