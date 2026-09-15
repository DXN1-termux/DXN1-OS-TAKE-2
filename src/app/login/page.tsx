"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Terminal, LogIn, User, Lock, AlertCircle, Loader2, ArrowRight, ChevronLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);

  useEffect(() => {
    // type out a quick "auth service starting" sequence
    const lines = [
      "[ ok ] starting dxn1-auth.service",
      "[ ok ] loading user database (sqlite)",
      "[ ok ] bcrypt password verifier ready",
      "[ ok ] session store initialized",
      "[ ok ] dxn1-auth listening on /api/auth",
    ];
    let i = 0;
    const t = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(t);
        return;
      }
      setBootLines((p) => [...p, lines[i]]);
      i++;
    }, 120);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    // check if setup is complete
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (me.user?.setupComplete) {
      router.push("/");
    } else {
      router.push("/setup");
    }
  };

  return (
    <div className="min-h-screen dxn1-surface flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="w-full max-w-md">
        {/* back to home */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 dxn1-mono text-xs text-emerald-400/70 hover:text-emerald-300 mb-6 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          back to dxn1-os
        </a>

        <div className="dxn1-panel dxn1-scanlines rounded-xl overflow-hidden">
          {/* terminal header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/15 bg-black/40">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <Terminal className="w-3.5 h-3.5 text-emerald-400 ml-2" />
            <span className="dxn1-mono text-[10px] text-emerald-500/60">dxn1-auth: login</span>
          </div>

          <div className="p-6">
            {/* logo + boot lines */}
            <div className="text-center mb-6">
              <div className="inline-block w-14 h-14 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center mb-3 dxn1-glow">
                <span className="dxn1-mono font-bold text-emerald-400">D1</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                DXN1<span className="dxn1-text-emerald dxn1-text-glow">-OS</span>
              </h1>
              <p className="dxn1-mono text-[11px] text-emerald-500/50">account login</p>
            </div>

            {/* boot log */}
            <div className="mb-4 space-y-0.5 min-h-[72px]">
              {bootLines.map((l, i) => (
                <div key={i} className="dxn1-mono text-[10px] text-emerald-400/70 dxn1-fade-up">
                  {l}
                </div>
              ))}
            </div>

            {/* form */}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="dxn1-mono text-[10px] text-emerald-500/60 uppercase block mb-1.5">
                  email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded pl-9 pr-3 py-2.5 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="dxn1-mono text-[10px] text-emerald-500/60 uppercase block mb-1.5">
                  password
                </label>
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

              {error && (
                <div className="flex items-center gap-2 dxn1-mono text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 font-semibold px-4 py-3 rounded-lg transition-colors dxn1-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    sign in
                  </>
                )}
              </button>
            </form>

            {/* divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-emerald-500/15" />
              <span className="dxn1-mono text-[10px] text-emerald-500/40">or</span>
              <div className="flex-1 h-px bg-emerald-500/15" />
            </div>

            {/* new account */}
            <a
              href="/setup"
              className="w-full flex items-center justify-center gap-2 dxn1-mono text-sm text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 px-4 py-3 rounded-lg transition-colors"
            >
              create account
              <ArrowRight className="w-4 h-4" />
            </a>

            <p className="mt-5 dxn1-mono text-[10px] text-emerald-500/40 text-center leading-relaxed">
              accounts are local to this DXN1-OS instance.
              <br />
              no data leaves your machine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
