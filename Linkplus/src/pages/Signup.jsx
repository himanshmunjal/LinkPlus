// Signup.jsx
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { signup } from "../api/api";
import Logo from "../components/Logo";
import { Input, Button, ErrorBanner, IconButton } from "../components/ui";

const Field = ({ label, type = "text", placeholder, autoComplete, value, error, onChange }) => (
  <label className="block mb-4">
    <span className="text-zinc-700 dark:text-white text-sm font-medium">{label}</span>
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      error={error}
      className="mt-2"
    />
    {error && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{error}</p>}
  </label>
);

/**
 * Props:
 *  onSuccess()  – called after successful signup
 *  onGoLogin()  – called when user clicks "Sign in"
 */
export default function Signup({ onSuccess, onGoLogin }) {
  const { saveAuth } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.username.trim() || form.username.length < 3)
      next.username = "Username must be at least 3 characters.";
    if (!form.email.includes("@")) next.email = "Enter a valid email address.";
    if (form.password.length < 8 || !/\d/.test(form.password))
      next.password = "Password must be ≥8 chars and contain a number.";
    if (form.password !== form.confirm) next.confirm = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      const data = await signup(form.username, form.email, form.password);
      saveAuth(data);
      onSuccess?.();
    } catch (e) {
      setServerError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative">
      <div className="absolute top-5 right-5">
        <IconButton label={isDark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
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
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-zinc-900 dark:text-white font-bold text-2xl">Create account</h1>
          </div>
          <p className="text-zinc-500 text-sm mb-6">Sign up for your LinkPulse account.</p>

          {serverError && (
            <div className="mb-5">
              <ErrorBanner>{serverError}</ErrorBanner>
            </div>
          )}

          <Field
            label="Username"
            placeholder="yourname"
            autoComplete="username"
            value={form.username}
            error={errors.username}
            onChange={set("username")}
          />
          <Field
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            error={errors.email}
            onChange={set("email")}
          />
          <Field
            label="Password"
            type="password"
            placeholder="Min 8 chars + number"
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={set("password")}
          />
          <Field
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={form.confirm}
            error={errors.confirm}
            onChange={set("confirm")}
          />

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Creating account…" : "Create account"}
          </Button>

          <p className="mt-5 text-center text-zinc-500 text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onGoLogin}
              className="text-zinc-900 dark:text-white font-semibold hover:opacity-70 transition-opacity"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
