import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket/socket";

function Login() {
  const navigate = useNavigate();

  const { setUser, setIsLoggedIn } =
    useContext(AuthContext);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log(
          "Authentication successful:",
          data
        );

        // SAVE TOKEN
        localStorage.setItem(
          "contest-app-token",
          data.token
        );

        setUser({
          id: data.id,
          email: data.email,
          userId: data.userId,
          socketId:
            sessionStorage.getItem(
              "socketId"
            ),
        });

        setIsLoggedIn(true);

        socket.emit("authenticate", {
          userId: data.id,
        });

        navigate("/");
      } else {
        console.error(
          "Authentication failed:",
          data
        );
      }
    } catch (error) {
      console.error(
        "Error during authentication:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function autoLogin() {
      const token = localStorage.getItem(
        "contest-app-token"
      );

      if (!token) return;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BASE_API_URL}/api/verify-token`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          console.log(
            "Auto login successful"
          );

          setUser({
            id: data?.id,
            email: data?.email,
            userId: data?.userId,
            socketId:
              sessionStorage.getItem(
                "socketId"
              ),
          });

          setIsLoggedIn(true);

          socket.emit("authenticate", {
            userId: data.id,
          });

          navigate("/");
        } else {
          console.error("Token invalid");

          localStorage.removeItem(
            "contest-app-token"
          );
        }
      } catch (error) {
        console.error(
          "Error during auto login:",
          error
        );
      }
    }

    autoLogin();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#000)] px-4">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
            Welcome
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            Login or create your account instantly
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          <p className="font-semibold">
            One-Step Authentication
          </p>

          <p className="mt-1 text-cyan-200/80">
            If your account already exists,
            you&apos;ll be logged in automatically.
            Otherwise, a new account will be
            created for you.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Password Hint */}
          <p className="-mt-2 text-xs text-gray-500">
            Use the same credentials next time
            to log back into your account.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-bold text-black shadow-lg shadow-cyan-500/20 transition duration-300 hover:scale-[1.02] hover:shadow-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? "Authenticating..."
              : "Continue"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <p className="text-sm text-gray-400">
            No separate signup needed ✨
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Enter your email and password to
            either log in or create a new
            account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;