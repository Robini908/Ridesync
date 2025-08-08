"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import { AIChatbot } from '@/components/ai-chatbot'

interface ChatbotContextType {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined)

export function useChatbot() {
  const context = useContext(ChatbotContext)
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider')
  }
  return context
}

interface ChatbotProviderProps {
  children: ReactNode
}

export function ChatbotProvider({ children }: ChatbotProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen(prev => !prev)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  const value: ChatbotContextType = {
    isOpen,
    toggle,
    open,
    close
  }

  return (
    <ChatbotContext.Provider value={value}>
      {children}
      <AIChatbot isOpen={isOpen} onToggle={toggle} />
    </ChatbotContext.Provider>
  )
}