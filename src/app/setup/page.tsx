"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Terminal,
  User,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Code2,
  GraduationCap,
  Check,
  Rocket,
} from "lucide-react";

type Step = "account" | "role" | "done";
type Role = "developer" | "student";

const ROLES: { id: Role; icon: any; title: string; desc: string; perks: string[] }[] = [
  {
    id: "developer",
    icon: Code2,
    title: "Developer",
    desc: "You build software. Get the full toolchain, package manager, and kernel-level access.",
    perks: ["dxn1-pkg access", "build from source tools", "driver dev docs", "SSH + git preinstalled"],
  },
  {
    id: "student",
    icon: GraduationCap,
    title: "Student",
    desc: "You're learning Linux. Get guided tutorials, cheat-sheets, and a safe sandbox to experiment.",
    perks: ["Linux command tutorials", "interactive cheat-sheets", "guided LFS build", "snapshot/restore"],
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createAccount = async () => {
    setError("");
    if (!email || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    // sign in immediately
    setLoading(true);
    const si = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (si?.error) {
      setError("Account created but sign-in failed — go to /login");
      return;
    }
    setStep("role");
  };

  const completeSetup = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, experience: role }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Setup save failed — your account was created though");
      return;
    }
    setStep("done");
    setTimeout(() => router.push("/"), 2500);
  };

  return (
    <div className="min-h-screen dxn1-surface flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="w-full max-w-lg">
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 dxn1-mono text-xs text-emerald-400/70 hover:text-emerald-300 mb-6 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          back to login
        </a>

        <div className="dxn1-panel dxn1-scanlines rounded-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/15 bg-black/40">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <Terminal className="w-3.5 h-3.5 text-emerald-400 ml-2" />
            <span className="dxn1-mono text-[10px] text-emerald-500/60">
              dxn1-setup: {step === "account" ? "1/2 account" : step === "role" ? "2/2 role" : "complete"}
            </span>
          </div>

          {/* progress bar */}
          <div className="flex border-b border-emerald-500/10">
            {["account", "role", "done"].map((s, i) => {
              const active = step === s || (step === "done" && s === "role");
              const past =
                (step === "role" && s === "account") || (step === "done" && s !== "done");
              return (
                <div
                  key={s}
                  className={`flex-1 h-1 ${active ? "bg-emerald-400" : past ? "bg-emerald-500/50" : "bg-emerald-500/10"}`}
                />
              );
            })}
          </div>

          <div className="p-6">
            {step === "account" && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    Create your <span className="dxn1-text-emerald">account</span>
                  </h1>
                  <p className="dxn1-mono text-[11px] text-emerald-500/50">
                    step 1 of 2 — credentials
                  </p>
                </div>

                <div>
                  <label className="dxn1-mono text-[10px] text-emerald-500/60 uppercase block mb-1.5">name (optional)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500/50" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded pl-9 pr-3 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="dxn1-mono text-[10px] text-emerald-500/60 uppercase block mb-1.5">email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded pl-9 pr-3 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="dxn1-mono text-[10px] text-emerald-500/60 uppercase block mb-1.5">password (8+ chars)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500/50" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded pl-9 pr-3 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="dxn1-mono text-[10px] text-emerald-500/60 uppercase block mb-1.5">confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500/50" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded pl-9 pr-3 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 dxn1-mono text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={createAccount}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 font-semibold px-4 py-3 rounded-lg transition-colors dxn1-glow"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  {loading ? "creating..." : "continue"}
                </button>
              </div>
            )}

            {step === "role" && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    Pick your <span className="dxn1-text-emerald">path</span>
                  </h1>
                  <p className="dxn1-mono text-[11px] text-emerald-500/50">
                    step 2 of 2 — customize DXN1-OS for you
                  </p>
                </div>

                <div className="space-y-3">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`w-full text-left rounded-lg border p-4 transition-colors ${
                        role === r.id
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-emerald-500/15 hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center shrink-0">
                          <r.icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-white font-semibold">{r.title}</span>
                            {role === r.id && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-xs text-emerald-100/60 leading-snug mb-2">{r.desc}</p>
                          <div className="flex flex-wrap gap-1">
                            {r.perks.map((p) => (
                              <span key={p} className="dxn1-mono text-[9px] text-amber-300/70 border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={completeSetup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 font-semibold px-4 py-3 rounded-lg transition-colors dxn1-glow"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {loading ? "saving..." : "finish setup"}
                </button>
              </div>
            )}

            {step === "done" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 dxn1-glow dxn1-pulse">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome to <span className="dxn1-text-emerald dxn1-text-glow">DXN1-OS</span>
                </h1>
                <p className="dxn1-mono text-xs text-emerald-500/60 mb-1">
                  account ready · role: {role}
                </p>
                <p className="dxn1-mono text-[11px] text-emerald-500/40">
                  redirecting to the dashboard...
                </p>
                <div className="mt-4 dxn1-mono text-[10px] text-emerald-400 dxn1-cursor" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
