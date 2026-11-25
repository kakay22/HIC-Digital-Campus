import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

import HICLogo from "../assets/HIC_LOGO_TRANSPARENT.png";

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 disabled:cursor-not-allowed disabled:bg-slate-50";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      toast.error("Please enter your username and password.");
      return;
    }

    try {
      setSubmitting(true);

      await login(username.trim(), password);

      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        "Invalid username or password.";

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7faf7] px-5 py-12 sm:px-8">
      {/* Logo, headline, context */}
      <div className="flex flex-col items-center text-center">
        <img
          src={HICLogo}
          alt="HIC Logo"
          className="h-24 w-auto object-contain sm:h-32"
        />

        <h1 className="mt-6 max-w-3xl text-balance text-3xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
          HIC TEACHER EVALUATION
        </h1>

        <span className="mt-4 rounded-full bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-800">
          Admin Login
        </span>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-10 w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
      >
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Username or email
          </label>

          <div className="relative">
            <Mail
              size={18}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username or email"
              className={`${inputClass} pr-4`}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole
              size={18}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className={`${inputClass} pr-12`}
              disabled={submitting}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
          {!submitting && <ArrowRight size={17} />}
        </button>
      </form>

      <Link
        to="/"
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-500 transition hover:bg-green-50 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <ArrowLeft size={16} />
        Back to student portal
      </Link>
    </main>
  );
}