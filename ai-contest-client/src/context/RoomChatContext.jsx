import { createContext , useState } from "react"

export const RoomChatContext = createContext()
const RoomChatContextProvider = ({ children }) => {
  const [messagesByRoom, setMessagesByRoom] = useState({})
  return (
        <RoomChatContext.Provider value={{ messagesByRoom, setMessagesByRoom }}>
          {children}
        </RoomChatContext.Provider>
  )
}

export default RoomChatContextProvider
