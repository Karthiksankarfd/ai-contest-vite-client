import { Link, useNavigate } from "react-router-dom"
import { useContext } from "react"
import { AuthContext } from "../context/AuthContext"

function Navbar() {
  const navigate = useNavigate()
  const { isLoggedIn, user , setIsLoggedIn} = useContext(AuthContext)

  return (
    <nav className="sticky top-0 z-50 border-b border-cyan-500/10 bg-gradient-to-br from-[#050816] via-[#0b1120] to-black backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Logo */}
        <Link
          to="/"
          className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-extrabold text-transparent transition duration-300 hover:scale-105"
        >
          ContestApp
        </Link>

        {/* Nav Links */}
        {isLoggedIn && (
          <div className="flex items-center gap-4">
            <Link
              to="/"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 transition duration-300 hover:bg-purple-500/10 hover:text-purple-400"
          >
            {isLoggedIn && `Welcome, ${user?.email || "User"}`}
          </Link>
            <Link
              to="/contests"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 transition duration-300 hover:bg-purple-500/10 hover:text-purple-400"
          >
            View Contests
          </Link>
          <Link
            to="/create-contest"
            className="rounded-xl bg-gradient-to-r from-green-400 to-blue-500 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-cyan-500/30 transition duration-300 hover:scale-105 hover:shadow-cyan-400/50"
          >
             {isLoggedIn && "Create Contest"}
          </Link>

          
          {isLoggedIn &&
                    <button   onClick={() => {
                      localStorage.removeItem("contest-app-token");
                      setIsLoggedIn(false)
                      navigate("/login");
                    }}
            to="/create-contest"
            className="rounded-xl bg-gradient-to-r from-orange-400 to-blue-500 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-cyan-500/30 transition duration-300 hover:scale-105 hover:shadow-cyan-400/50"
          >
             Logout
          </button>
           }


        </div>
        )}
      </div>

    </nav>
  )
}

export default Navbar