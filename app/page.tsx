import Link from "next/link";
import { getSupabaseUser } from "@/providers/supabase/auth-helpers";

export default async function HomePage() {
  const user = await getSupabaseUser();

  return (
    <div className="min-h-screen bg-cream text-text">
      {/* Nav - full width, no inner container, matching original */}
      <nav className="sticky top-0 z-[100] flex items-center justify-between border-b border-border px-6 py-3.5" style={{ background: "rgba(253,251,247,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="text-xl font-bold">
          <span className="text-violet">Fit</span>Pay
        </div>
        <div className="flex items-center gap-7">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-[10px] bg-violet px-[22px] py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-violet-dark"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <a href="#concept" className="hidden text-sm font-medium text-mid no-underline transition-colors hover:text-violet md:block">
                How it works
              </a>
              <a href="#features" className="hidden text-sm font-medium text-mid no-underline transition-colors hover:text-violet md:block">
                Features
              </a>
              <a href="#pricing" className="hidden text-sm font-medium text-mid no-underline transition-colors hover:text-violet md:block">
                Pricing
              </a>
              <Link
                href="/login"
                className="rounded-[10px] bg-violet px-[22px] py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-violet-dark"
              >
                Get early access
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1100px] px-6 pb-[60px] pt-20 text-center">
        <div className="mb-6 inline-block rounded-full bg-violet-light px-4 py-1.5 text-[13px] font-semibold text-violet-dark">
          Built for UK fitness coaches
        </div>
        <h1
          className="mb-5 font-serif leading-[1.1]"
          style={{ fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          Get paid for <em className="not-italic text-violet">results</em>,
          <br />
          not just sign-ups.
        </h1>
        <p className="mx-auto mb-8 max-w-[580px] text-lg leading-[1.7] text-mid">
          FitPay handles payments for your coaching programmes with a built-in bonus pot that
          rewards you when clients hit their goals. Structured payments. Zero admin. Better
          completion rates.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-[12px] bg-violet px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
          >
            Get early access - it&apos;s free
          </Link>
          <a
            href="#concept"
            className="rounded-[12px] border-2 border-border bg-transparent px-7 py-3 text-base font-semibold text-text transition-all hover:border-violet hover:text-violet"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* How it works flow */}
      <div className="mx-auto max-w-[700px] px-6">
        <div className="flex flex-wrap justify-center">
          {[
            { n: "1", title: "Create programme", desc: "Set base fee + bonus pot amount" },
            { n: "2", title: "Client pays", desc: "Instalments or upfront via Stripe" },
            { n: "3", title: "Client trains", desc: "Check-ins and progress tracked" },
            { n: "4", title: "Bonus releases", desc: "Coach gets paid for outcomes" },
          ].map((step, i) => (
            <div key={i} className="relative min-w-[140px] flex-1 px-4 py-5 text-center">
              <div
                className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-violet-light font-serif text-lg text-violet"
                style={{ fontWeight: 900 }}
              >
                {step.n}
              </div>
              <h3 className="mb-1 text-sm font-bold">{step.title}</h3>
              <p className="text-xs leading-normal text-muted">{step.desc}</p>
              {i < 3 && (
                <span className="absolute right-[-8px] top-1/2 hidden -translate-y-1/2 text-2xl text-border md:block">
                  &rarr;
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Concept section */}
      <section id="concept" className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-violet">The concept</p>
        <h2
          className="mb-4 font-serif leading-[1.15]"
          style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          Base fee + bonus pot = aligned incentives
        </h2>
        <p className="max-w-[600px] text-[17px] leading-[1.7] text-mid">
          Your client pays for a 12-week programme. Part goes to you immediately. Part sits in a
          bonus pot that releases when milestones are hit.
        </p>

        <div className="mt-10 grid gap-6 rounded-[14px] bg-violet-dark p-8 text-white md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-serif text-[22px] font-bold">For the coach</h3>
            <p className="text-sm leading-[1.7] text-white/75">
              You earn your base fee regardless. But when your client hits their goals - attendance,
              check-ins, progress photos - the bonus pot releases to you too. You get rewarded for
              doing great work, not just selling.
            </p>
            <div className="my-4 flex h-8 overflow-hidden rounded-lg">
              <div className="bg-violet" style={{ flex: 78 }} />
              <div className="bg-amber" style={{ flex: 22 }} />
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>£700 base fee (yours immediately)</span>
              <span>£200 bonus pot</span>
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-serif text-[22px] font-bold">For the client</h3>
            <p className="text-sm leading-[1.7] text-white/75">
              They&apos;re not just paying for a PDF plan. They&apos;ve got financial skin in the game. The
              bonus pot creates accountability - miss too many check-ins and the coach doesn&apos;t get
              the bonus. It&apos;s a partnership, not a transaction.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-[10px] bg-white/10 px-4 py-2.5 text-[13px]">89% completion rate</div>
              <div className="rounded-[10px] bg-white/10 px-4 py-2.5 text-[13px]">vs 60% industry average</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-violet">Features</p>
        <h2
          className="mb-4 font-serif leading-[1.15]"
          style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          Everything a coach needs. Nothing they don&apos;t.
        </h2>
        <p className="max-w-[600px] text-[17px] leading-[1.7] text-mid">
          FitPay handles money and accountability. We don&apos;t do programming, meal plans, or exercise
          libraries. Your coaching tools stay yours.
        </p>
        <div className="mt-10 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {[
            { icon: "💷", bg: "bg-violet-light", title: "Staged payments", desc: "Collect upfront, in instalments, or split across milestones. Stripe handles the money. You see a clean dashboard." },
            { icon: "🏆", bg: "bg-amber-light", title: "Bonus pot engine", desc: "Set milestone criteria at programme creation. System holds the pot and releases automatically when criteria are met." },
            { icon: "📸", bg: "bg-green-light", title: "Progress verification", desc: "Clients upload progress photos with timestamps. Check-in logging. Attendance tracking. All evidence-based." },
            { icon: "📊", bg: "bg-violet-light", title: "Cohort dashboard", desc: "See all your clients across programmes. Who's paid, who's on track, who needs a nudge. Completion rates at a glance." },
            { icon: "🔗", bg: "bg-amber-light", title: "Client checkout links", desc: "Send a branded link. Client selects their programme, chooses a payment plan, accepts terms, and pays. Done in 2 minutes." },
            { icon: "🤝", bg: "bg-green-light", title: "Works with your tools", desc: "Use TrueCoach, My PT Hub, or a Google Sheet? FitPay sits alongside them. We handle money, they handle programming." },
          ].map((f, i) => (
            <div
              key={i}
              className="flex gap-3.5 rounded-[14px] border border-border bg-white p-[22px] transition-all hover:border-violet hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]"
            >
              <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] text-xl ${f.bg}`}>
                {f.icon}
              </div>
              <div>
                <h3 className="mb-[3px] text-[15px] font-bold">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-mid">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-violet">Pricing</p>
        <h2
          className="mb-4 font-serif leading-[1.15]"
          style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          Free to start. Pay when you grow.
        </h2>
        <p className="max-w-[600px] text-[17px] leading-[1.7] text-mid">
          No upfront costs. No monthly fees until you have more than 5 active clients.
        </p>
        <div className="mt-10 grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {[
            {
              name: "Starter", target: "Up to 5 active clients", price: "Free", note: "+ 1% platform fee per programme sold",
              featured: true,
              features: ["Programme builder with bonus pot", "Client checkout links", "Staged payment collection", "Milestone tracking", "Coach dashboard", "Progress photo uploads"],
            },
            {
              name: "Pro", target: "6+ active clients", price: "£29", period: "/mo", note: "+ 1% platform fee per programme sold",
              features: ["Everything in Starter", "Unlimited active clients", "Cohort analytics and completion rates", "Custom branded checkout", "Automated payment reminders", "Priority support"],
            },
            {
              name: "Studio", target: "Gyms, studios, and teams", price: "£79", period: "/mo", note: "+ 1% platform fee per programme sold",
              features: ["Everything in Pro", "Multiple coach accounts", "White-label checkout", "Revenue reporting across coaches", "Challenge and transformation campaigns"],
            },
          ].map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-[14px] border bg-white transition-all ${
                plan.featured
                  ? "scale-[1.02] border-violet shadow-[0_8px_30px_rgba(124,58,237,0.12)]"
                  : "border-border"
              }`}
              style={{ padding: "32px 28px" }}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet px-3.5 py-1 text-[11px] font-bold text-white">
                  Recommended
                </span>
              )}
              <div className="font-serif text-[22px] font-bold">{plan.name}</div>
              <div className="mb-4 text-[13px] text-muted">{plan.target}</div>
              <div className="mb-1 font-serif text-4xl text-violet" style={{ fontWeight: 900 }}>
                {plan.price}
                {plan.period && <span className="text-base font-normal text-muted">{plan.period}</span>}
              </div>
              <div className="mb-5 text-xs text-muted">{plan.note}</div>
              <ul className="mb-6 list-none space-y-1.5">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-mid">
                    <span className="font-bold text-violet">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`block w-full rounded-[10px] py-3 text-center text-sm font-semibold transition-all ${
                  plan.featured
                    ? "bg-violet text-white hover:bg-violet-dark"
                    : "border-2 border-violet bg-transparent text-violet hover:bg-violet-50"
                }`}
              >
                Get early access
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div id="cta" className="border-t border-border bg-warm">
        <section className="mx-auto max-w-[700px] px-6 py-20 text-center">
          <h2
            className="mb-3 font-serif"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800 }}
          >
            Ready to get paid for results?
          </h2>
          <p className="mb-7 text-[17px] text-mid">
            Join the early access list. We&apos;re onboarding our first 15 coaches now - with free
            setup and personal support.
          </p>
          <div className="mx-auto flex max-w-[460px] justify-center">
            <Link
              href="/login"
              className="rounded-[12px] bg-violet px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark"
            >
              Get early access - it&apos;s free
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">Free for your first 5 clients. No card required.</p>
        </section>
      </div>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-10">
        <p className="text-[13px] text-muted">&copy; 2026 FitPay. Built for UK fitness coaches.</p>
        <div className="flex gap-5">
          <a href="mailto:hello@fitpay.co.uk" className="text-[13px] text-muted no-underline transition-colors hover:text-violet">Contact</a>
          <a href="#" className="text-[13px] text-muted no-underline transition-colors hover:text-violet">Privacy</a>
          <a href="#" className="text-[13px] text-muted no-underline transition-colors hover:text-violet">Terms</a>
        </div>
      </footer>
    </div>
  );
}
