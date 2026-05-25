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

  const [error, setError] =
    useState("");

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

    // clear error while typing
    if (error) {
      setError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            formData
          ),
        }
      );

      const data =
        await response.json();

      if (response.ok) {
        console.log(
          "Authentication successful:",
          data
        );

        // save token
        localStorage.setItem(
          "contest-app-token",
          data.token
        );

        // socket auth first
        socket.auth = {
          token: data.token,
        };

        // connect socket
        socket.connect();

        setUser(() => ({
          id: data?.id,
          email: data?.email,
          userId: data?.userId,
        }));

        setIsLoggedIn(() => true);


          navigate("/");

      } else {
        console.error(
          "Authentication failed:",
          data
        );

        setError(
          data?.message ||
            "Invalid email or password"
        );
      }
    } catch (error) {
      console.error(
        "Error during authentication:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function autoLogin() {
      const token =
        localStorage.getItem(
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

        const data =
          await response.json();

        if (response.ok) {
          console.log(
            "Auto login successful"
          );

          socket.auth = {
            token,
          };

          socket.connect();

          setUser({
            id: data?.id,
            email: data?.email,
            userId:
              data?.userId,
            socketId:
              sessionStorage.getItem(
                "socketId"
              ),
          });

          setIsLoggedIn(true);


            navigate("/");

        } else {
          console.error(
            "Token invalid"
          );

          localStorage.removeItem(
            "contest-app-token"
          );

          setError(
            "Session expired. Please login again."
          );
        }
      } catch (error) {
        console.error(
          "Error during auto login:",
          error
        );

        setError(
          "Unable to verify session."
        );
      }
    }

    autoLogin();
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black px-4">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
            Welcome
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            Login or create your
            account instantly
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          <p className="font-semibold">
            One-Step Authentication
          </p>

          <p className="mt-1 leading-relaxed text-cyan-200/80">
            If your account
            exists, you'll be
            logged in
            automatically.
            Otherwise, a new
            account will be
            created.
          </p>
        </div>

        {/* Error Card */}
        {error && (
          <div className="mb-5 animate-pulse rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 shadow-lg shadow-red-500/10 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg">
                ⚠️
              </div>

              <div>
                <p className="font-semibold text-red-300">
                  Authentication
                  Failed
                </p>

                <p className="mt-1 text-red-200/80">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Hint */}
          <p className="-mt-2 text-xs text-gray-500">
            Use the same
            credentials next
            time to log back in.
          </p>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 py-3 font-semibold text-black shadow-lg shadow-cyan-500/20 transition duration-300 hover:scale-[1.02] hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="relative z-10">
              {loading
                ? "Authenticating..."
                : "Continue"}
            </span>

            <span className="absolute inset-0 bg-white opacity-0 transition group-hover:opacity-10" />
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <p className="text-sm text-gray-400">
            No separate signup
            needed ✨
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Enter your email
            and password to log
            in or create a new
            account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;