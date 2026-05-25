import { createContext, useState } from "react"

export const ChatWindowContext = createContext()

export default function ChatWindowProvider({ children }) {
  const [activeChatWindow, setActiveChatWindow] = useState(null)
  const [eliminatedContestList , setEliminatedContestList] = useState(new Set());
  return (
    <ChatWindowContext.Provider value={{ activeChatWindow, setActiveChatWindow , eliminatedContestList , setEliminatedContestList}}>
      {children}
    </ChatWindowContext.Provider>
  )
}

