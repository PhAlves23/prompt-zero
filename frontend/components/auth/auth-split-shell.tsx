import Link from "next/link"
import type { ReactNode } from "react"

type AuthSplitShellProps = {
  title: string
  description: string
  footerText: string
  footerActionLabel: string
  footerActionHref: string
  leftTagline: string
  children: ReactNode
}

/** Painel esquerdo: malha + marca (sem estado; só visual). */
function AuthMeshPanel() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#060607]" />

      <div className="absolute -left-[20%] top-[-10%] h-[55%] w-[85%] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.918_0.244_127.5/0.14),transparent_68%)] blur-3xl" />
      <div className="absolute bottom-[-15%] right-[-25%] h-[60%] w-[90%] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.628_0.225_293.5/0.12),transparent_65%)] blur-3xl" />
      <div className="absolute left-1/3 top-1/2 h-[40%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.798_0.156_210.5/0.08),transparent_70%)] blur-3xl" />

      <div
        className="absolute inset-[-15%] opacity-[0.4]"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.918 0.244 127.5 / 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.918 0.244 127.5 / 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          transform: "perspective(720px) rotateX(14deg) scale(1.08)",
          transformOrigin: "50% 40%",
          maskImage: "radial-gradient(ellipse 85% 72% at 42% 48%, black 18%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 72% at 42% 48%, black 18%, transparent 72%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(105deg, oklch(0.918 0.244 127.5 / 0.04) 1px, transparent 1px),
            linear-gradient(105deg, transparent 49%, oklch(0.918 0.244 127.5 / 0.06) 50%, transparent 51%)
          `,
          backgroundSize: "72px 72px, 100% 100%",
          maskImage: "radial-gradient(ellipse 90% 80% at 38% 52%, black 25%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 38% 52%, black 25%, transparent 78%)",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full text-pz-lime opacity-[0.35]"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="auth-mesh-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.22" />
          </linearGradient>
          <radialGradient id="auth-mesh-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g fill="none" stroke="url(#auth-mesh-line)" strokeWidth="0.75" strokeLinecap="round">
          <path d="M-20 180 C 120 120, 200 280, 340 200 S 520 80, 620 220" />
          <path d="M40 420 C 160 300, 280 480, 400 360 S 560 200, 720 340" opacity="0.7" />
          <path d="M80 -40 C 200 80, 320 -20, 480 100 S 640 200, 780 40" opacity="0.55" />
        </g>
        <g fill="url(#auth-mesh-glow)">
          <circle cx="18%" cy="22%" r="3" className="text-pz-lime" />
          <circle cx="52%" cy="38%" r="2.5" className="text-pz-lime" />
          <circle cx="72%" cy="28%" r="2" className="text-pz-lime" />
          <circle cx="38%" cy="62%" r="2.5" className="text-pz-lime" />
          <circle cx="85%" cy="55%" r="2" className="text-pz-lime" />
          <circle cx="62%" cy="78%" r="2" className="text-pz-lime" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-start pl-[6%]">
        <span
          className="font-heading font-black leading-none text-transparent opacity-[0.92] select-none"
          style={{
            fontSize: "clamp(10rem, min(32vw, 22rem), 22rem)",
            WebkitTextStroke: "1.5px oklch(0.918 0.244 127.5 / 0.14)",
          }}
        >
          0
        </span>
      </div>

      <div className="pointer-events-none absolute right-[10%] top-[18%] font-heading text-6xl font-bold leading-none text-[#F5F5F7]/4 sm:text-7xl">
        0
      </div>
      <div className="pointer-events-none absolute bottom-[32%] left-[22%] font-heading text-4xl font-bold leading-none text-[#F5F5F7]/5">
        0
      </div>
      <div className="pointer-events-none absolute right-[24%] bottom-[22%] font-heading text-5xl font-bold text-pz-lime/[0.06]">
        0
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_top,#060607_0%,transparent_28%),linear-gradient(to_right,#060607_0%,transparent_18%)]" />
    </div>
  )
}

export function AuthSplitShell({
  title,
  description,
  footerText,
  footerActionLabel,
  footerActionHref,
  leftTagline,
  children,
}: AuthSplitShellProps) {
  return (
    <main className="min-h-screen bg-[#0A0A0B]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative order-1 hidden overflow-hidden border-r border-[#2A2A32] lg:block">
          <AuthMeshPanel />

          <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.918_0.244_127.5/0.22),transparent_72%)] blur-2xl" />

          <div className="relative z-10 flex h-full min-h-[min(100vh,720px)] flex-col justify-end p-8 sm:p-10 lg:p-12">
            <div className="rounded-2xl border border-[#2A2A32]/90 bg-[#0A0A0C]/75 p-6 shadow-[0_0_0_1px_oklch(0.918_0.244_127.5/0.06)_inset] backdrop-blur-md sm:p-7">
              <p className="font-heading text-3xl font-bold tracking-tight text-[#F5F5F7] sm:text-4xl">
                prompt<span className="text-pz-lime">zero</span>
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#8B8B9A]">
                {leftTagline}
              </p>
            </div>
          </div>
        </aside>

        <section className="order-2 flex min-h-screen items-center justify-center bg-white px-4 py-10 text-zinc-900 sm:px-6 lg:px-12 dark:[&_input]:border-zinc-200 dark:[&_input]:bg-zinc-50 dark:[&_input]:text-zinc-900 dark:[&_input]:placeholder:text-zinc-400 dark:[&_label]:text-zinc-800">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 space-y-2">
              <p className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                prompt<span className="text-pz-lime">zero</span>
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
              <p className="text-sm text-zinc-600">{description}</p>
            </div>
            {children}
            <p className="mt-5 text-sm text-zinc-600">
              {footerText}{" "}
              <Link href={footerActionHref} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
                {footerActionLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
