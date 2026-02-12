"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError("Email already registered. Please log in instead.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Auto-login after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Signup succeeded but auto-login failed — redirect to login
        router.push("/auth/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-tier1-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-tier1-primary tracking-tight">
            WriteWise Kids
          </h1>
          <p className="mt-2 text-tier1-text/60 text-lg">
            Create an account to start your writing journey!
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-tier1-primary/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error/10 text-error border border-error/20 rounded-xl px-4 py-3 text-sm font-semibold">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-bold text-tier1-text mb-1.5"
              >
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-xl border border-tier1-primary/20 bg-tier1-bg/50 text-tier1-text placeholder:text-tier1-text/30 focus:outline-none focus:ring-2 focus:ring-tier1-primary/40 focus:border-tier1-primary transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-tier1-text mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="parent@example.com"
                className="w-full px-4 py-3 rounded-xl border border-tier1-primary/20 bg-tier1-bg/50 text-tier1-text placeholder:text-tier1-text/30 focus:outline-none focus:ring-2 focus:ring-tier1-primary/40 focus:border-tier1-primary transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-tier1-text mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 rounded-xl border border-tier1-primary/20 bg-tier1-bg/50 text-tier1-text placeholder:text-tier1-text/30 focus:outline-none focus:ring-2 focus:ring-tier1-primary/40 focus:border-tier1-primary transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-tier1-text mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 rounded-xl border border-tier1-primary/20 bg-tier1-bg/50 text-tier1-text placeholder:text-tier1-text/30 focus:outline-none focus:ring-2 focus:ring-tier1-primary/40 focus:border-tier1-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-tier1-primary text-white rounded-xl font-bold text-base hover:bg-tier1-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-tier1-text/60">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-tier1-primary font-bold hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
