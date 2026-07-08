// Login.jsx
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { login } from "../api/api";
import Logo from "../components/Logo";
import { Input, Button, ErrorBanner, IconButton } from "../components/ui";

/**
 * Props:
 *  onSuccess()   – called after login (e.g. navigate to dashboard)
 *  onGoSignup()  – called when user clicks "Sign up"
 */
export default function Login({ onSuccess, onGoSignup }) {
  const { saveAuth } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await login(form.email, form.password);
      console.log("Login successful");
      console.log("onSuccess:", onSuccess);
      saveAuth(data);
      onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative">
      <div className="absolute top-5 right-5">
        <IconButton label={isDark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </IconButton>
      </div>

      <div className="w-full max-w-md">
        {/* Logo / wordmark */}
        <div className="flex items-center justify-center mb-10">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 rounded-3xl p-8"
        >
          {/* Heading row */}
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-zinc-900 dark:text-white font-bold text-2xl">Welcome back</h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm mb-6">
            Sign in to your LinkPulse account.
          </p>

          {error && (
            <div className="mb-5">
              <ErrorBanner>{error}</ErrorBanner>
            </div>
          )}

          {/* Email */}
          <label className="block mb-4">
            <span className="text-zinc-700 dark:text-white text-sm font-medium">Email</span>
            <Input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-2"
            />
          </label>

          {/* Password */}
          <label className="block mb-6">
            <span className="text-zinc-700 dark:text-white text-sm font-medium">Password</span>
            <Input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              autoComplete="current-password"
              className="mt-2"
            />
          </label>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign In"}
          </Button>

          <p className="mt-5 text-center text-zinc-500 text-sm">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onGoSignup}
              className="text-zinc-900 dark:text-white font-semibold hover:opacity-70 transition-opacity"
            >
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
