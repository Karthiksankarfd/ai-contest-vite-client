import "./App.css";
import Navbar from "./components/Navbar";
import AuthProvider from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import SocketProvider from "./context/SocketContext";
import ContestListProvider from "./context/ContestList";
import RoomChatContextProvider from "./context/RoomChatContext";

function App() {
  return (
    <AuthProvider>
      <ContestListProvider>
        <SocketProvider>
          <RoomChatContextProvider>
              <div className="min-h-screen bg-black bg-[radial-gradient(circle_at_top,_#0f172a,_#000)] px-10">
                <Navbar />
                <AppRoutes />
              </div>
          </RoomChatContextProvider>
        </SocketProvider>
      </ContestListProvider>
    </AuthProvider>
  );
}

export default App;
