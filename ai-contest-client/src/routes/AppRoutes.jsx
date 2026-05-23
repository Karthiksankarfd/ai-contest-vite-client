import {Routes, Route} from "react-router-dom" ;
import Login from "../pages/Login";
import Contest from "../pages/Contest";
import ProtectedRoute from "../components/cmptprotector/ProtectedRoute";
import CreateContest from "../pages/CreateContest";
import ContestRoom from "../pages/ContestRoom";
const AppRoutes = () => {

  return (
    <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/" element={<ProtectedRoute> <ContestRoom/></ProtectedRoute>} />
        <Route path="/create-contest" element={<ProtectedRoute><CreateContest/></ProtectedRoute>} />
        {/* <Route path="/contests" element={<ProtectedRoute><ContestRoom/></ProtectedRoute>} /> */}
    </Routes>
  )
}

export default AppRoutes
