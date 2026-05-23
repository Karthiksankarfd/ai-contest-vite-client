import { createContext, useEffect, useState } from "react";
import { socket } from "../services/socket/socket";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);


  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.auth = {
      userId: user.id,
    };

    socket.emit("authenticate", {
      userId: user.id,
    });
  }, [isLoggedIn, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoggedIn,
        setIsLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

