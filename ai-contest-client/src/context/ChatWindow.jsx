import { createContext, useState } from "react"

const ChatWindowContext = createContext()

export default function ChatWindowProvider({ children }) {
  const [activeChatWindow, setActiveChatWindow] = useState(null)
  return (
    <ChatWindowContext.Provider value={{ activeChatWindow, setActiveChatWindow }}>
      {children}
    </ChatWindowContext.Provider>
  )
}

