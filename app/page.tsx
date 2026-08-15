"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/logo";

/* ───── Matrix Rain Canvas ─────
   Rewritten: requestAnimationFrame instead of a 20fps setInterval, DPR-aware
   so it isn't blurry on retina, pauses when the tab is hidden, thins out on
   phones, and turns itself off entirely for prefers-reduced-motion. The old
   version ran a timer forever and drained mobile batteries. */
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const chars =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";

    // Bigger glyphs + fewer columns on small screens keeps the frame cost low
    const isSmall = window.innerWidth < 768;
    const fontSize = isSmall ? 18 : 14;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let columns = 0;
    let drops: number[] = [];
    let raf = 0;
    let last = 0;
    const frameMs = isSmall ? 90 : 55; // slower cadence on phones

    function resize() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.floor(w / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -20);
    }

    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      if (ts - last < frameMs) return;
      last = ts;
      if (!canvas || !ctx) return;

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.fillStyle = "rgba(8, 8, 16, 0.06)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * fontSize;
        if (y > 0 && y < h) {
          ctx.fillStyle = "#e9d5ff";
          ctx.fillText(chars[(Math.random() * chars.length) | 0], i * fontSize, y);
          if (drops[i] > 1) {
            ctx.fillStyle = "#7c3aed";
            ctx.fillText(chars[(Math.random() * chars.length) | 0], i * fontSize, y - fontSize);
          }
        }
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    // Debounced resize — orientation changes fired this dozens of times before
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  );
}

/* ───── Reveal on scroll ─────
   Now uses a .reveal CSS class so content is still readable if the observer
   never fires, and unobserves after revealing instead of watching forever. */
function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "span";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer support, or user prefers reduced motion → show immediately
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.classList.add("is-visible");
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);

    // Safety net: anything still hidden after 2.5s gets shown anyway
    const failsafe = setTimeout(() => el.classList.add("is-visible"), 2500);

    return () => {
      obs.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLSpanElement>}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}

/* ───── FAQ Item ─────
   The old version clamped the answer to a hardcoded 300px, which clipped
   longer answers once text wrapped on a phone. Now it animates to the real
   content height and exposes proper accordion semantics. */
function FaqItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      <h3>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={`faq-panel-${id}`}
          id={`faq-btn-${id}`}
          className="flex items-center justify-between gap-4 py-5 w-full text-left text-[15px] sm:text-base font-semibold text-white hover:text-[var(--accent-light)] transition-colors cursor-pointer bg-transparent border-none"
        >
          <span>{q}</span>
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] transition-all duration-300"
            style={{
              borderColor: open ? "rgba(124,58,237,0.4)" : "var(--border)",
              background: open ? "rgba(124,58,237,0.15)" : "transparent",
              color: "var(--accent-light)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>
      </h3>
      <div
        className="accordion-panel"
        data-open={open}
        id={`faq-panel-${id}`}
        role="region"
        aria-labelledby={`faq-btn-${id}`}
      >
        <div>
          <p className="pb-5 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───── Testimonial Card ───── */
function TestimonialCard({
  text,
  name,
  role,
  initials,
}: {
  text: string;
  name: string;
  role: string;
  initials: string;
}) {
  return (
    <div
      className="flex-shrink-0 w-[280px] sm:w-[340px] lg:w-[360px] rounded-2xl p-6 sm:p-7 border transition-colors hover:border-[rgba(124,58,237,0.45)]"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="text-[var(--accent-light)] text-sm mb-3.5 tracking-widest">★★★★★</div>
      <p className="text-sm sm:text-[15px] italic leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold text-white"
          style={{ background: "var(--gradient)" }}
        >
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {role}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open, and close it on Escape or
  // on resize past the md breakpoint (otherwise it stayed open behind the
  // desktop nav after an orientation change).
  useEffect(() => {
    document.body.classList.toggle("menu-open", mobileOpen);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: "How it Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQs", href: "#faq" },
    { label: "Blog", href: "#blog" },
    { label: "Contact", href: "#footer" },
  ];

  const testimonials1 = [
    { text: "Decod3X caught deepfake content our team missed for weeks. The confidence scores are incredibly reliable.", name: "Sarah K.", role: "Head of Trust & Safety", initials: "SK" },
    { text: "We run millions of documents through the API daily. The accuracy and uptime are unmatched in the industry.", name: "Marcus T.", role: "Chief Compliance Officer", initials: "MT" },
    { text: "AI-written submissions were a major problem. Decod3X gave us the verification layer we desperately needed.", name: "Priya N.", role: "EdTech Founder", initials: "PN" },
  ];
  const testimonials2 = [
    { text: "The deepfake detection saved us from publishing manipulated footage. This tool is now core to our editorial process.", name: "James R.", role: "Media Director", initials: "JR" },
    { text: "For legal documents and contracts, authenticity is everything. Decod3X gives us the audit trail we need.", name: "Lisa M.", role: "Legal Counsel", initials: "LM" },
    { text: "Integration took under an hour. The API is clean, fast, and the results speak for themselves.", name: "David C.", role: "CTO", initials: "DC" },
  ];

  const integrations = ["🔔 Slack", "📝 Notion", "🌐 Google Workspace", "💼 Microsoft 365", "⚡ Zapier", "☁️ Salesforce", "🟠 HubSpot", "🟡 AWS"];

  const faqs = [
    { q: "How accurate is Decod3X?", a: "Our models achieve >99% accuracy on benchmarks across AI text, images, and synthetic media. We continuously retrain on new model outputs to stay ahead of emerging generation techniques." },
    { q: "What content types can be analyzed?", a: "Text documents, images, audio clips, and video files. We support PDF, DOCX, JPG, PNG, MP3, MP4, and more. Additional formats are added regularly based on customer requests." },
    { q: "Is my data secure?", a: "All submissions are encrypted in transit and at rest using AES-256. We are SOC 2 Type II certified. We never store or train on your content — your data is processed and discarded after analysis." },
    { q: "Can I integrate via API?", a: "Yes. Our REST API supports all major languages including Python, Node.js, Go, and Java. Full docs, code samples, and SDKs are available immediately upon sign-up. Average integration time is under 60 minutes." },
    { q: "Do you offer enterprise plans?", a: "Yes. Contact us for custom volume pricing, SLAs, dedicated infrastructure, and compliance exports including SOC 2, GDPR, and HIPAA-ready configurations for regulated industries." },
    { q: "Is there a free trial?", a: "Absolutely. Sign up free and your first scan is on us — no credit card required. Free plan never expires. Upgrade anytime when you need more capacity." },
  ];

  return (
    <>
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 pt-safe"
        style={{
          height: "calc(var(--nav-h) + var(--safe-t))",
          background: scrolled || mobileOpen ? "rgba(8,8,16,0.92)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(124,58,237,0.15)" : "none",
        }}
      >
        <div
          className="max-w-[1200px] mx-auto gutter flex items-center justify-between gap-4 lg:gap-8"
          style={{ height: "var(--nav-h)" }}
        >
          <Logo size={36} animated className="flex-shrink-0" />

          <ul className="hidden md:flex items-center gap-6 lg:gap-8 list-none">
            {navLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-[var(--text-secondary)] text-sm font-medium hover:text-white transition-colors no-underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <Link
              href="/auth/login"
              className="hidden md:inline text-[var(--text-secondary)] text-sm font-medium hover:text-white transition-colors no-underline"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="hidden md:inline-flex bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-5 py-2.5 rounded-lg text-sm font-semibold no-underline hover:shadow-[0_0_20px_var(--accent-glow)] hover:scale-[1.03] transition-all"
            >
              Get started
            </Link>

            {/* Hamburger — now animates into an X and announces its state */}
            <button
              className="flex md:hidden items-center justify-center w-11 h-11 -mr-2 bg-transparent border-none cursor-pointer rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <span className="relative block w-6 h-4">
                <span
                  className="absolute left-0 block w-6 h-0.5 bg-white rounded-sm transition-all duration-300"
                  style={{
                    top: mobileOpen ? "7px" : "0px",
                    transform: mobileOpen ? "rotate(45deg)" : "none",
                  }}
                />
                <span
                  className="absolute left-0 top-[7px] block w-6 h-0.5 bg-white rounded-sm transition-all duration-200"
                  style={{ opacity: mobileOpen ? 0 : 1, transform: mobileOpen ? "scaleX(0)" : "none" }}
                />
                <span
                  className="absolute left-0 block w-6 h-0.5 bg-white rounded-sm transition-all duration-300"
                  style={{
                    top: mobileOpen ? "7px" : "14px",
                    transform: mobileOpen ? "rotate(-45deg)" : "none",
                  }}
                />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu — full-height sheet, scrollable, closes on tap */}
      <div
        id="mobile-menu"
        className="md:hidden fixed inset-0 z-[999] transition-opacity duration-300"
        style={{
          top: "calc(var(--nav-h) + var(--safe-t))",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
        }}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop: tapping outside the panel closes the menu */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className="relative flex flex-col gutter py-6 pb-safe border-b max-h-full overflow-y-auto transition-transform duration-300"
          style={{
            background: "rgba(8,8,16,0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "var(--border)",
            transform: mobileOpen ? "translateY(0)" : "translateY(-12px)",
          }}
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center text-[var(--text-secondary)] text-base font-medium hover:text-white active:text-white no-underline py-3.5 border-b border-white/5"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/auth/login"
            className="flex items-center text-[var(--text-secondary)] text-base font-medium hover:text-white no-underline py-3.5"
            onClick={() => setMobileOpen(false)}
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white text-center py-3.5 rounded-lg font-semibold no-underline mt-2"
            onClick={() => setMobileOpen(false)}
          >
            Get started
          </Link>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section
        id="main"
        className="relative min-h-screen-safe flex items-center justify-center overflow-hidden"
        style={{ paddingTop: "calc(var(--nav-h) + var(--safe-t) + 24px)", paddingBottom: "48px" }}
      >
        <MatrixRain />
        <div
          className="absolute w-[min(600px,140vw)] aspect-square rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)" }}
        />
        <div className="relative z-[2] text-center max-w-[800px] gutter">
          <div className="inline-flex items-center gap-2 bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.35)] text-[var(--accent-light)] text-xs sm:text-[13px] font-semibold px-3.5 sm:px-4 py-2 rounded-full mb-6 sm:mb-7 backdrop-blur-sm">
            🔍 Trusted by 500+ companies
          </div>
          <h1 className="text-[clamp(34px,8.5vw,72px)] font-extrabold leading-[1.08] tracking-tight mb-5 text-balance">
            Detect AI.
            <br />
            <span className="bg-gradient-to-br from-[#7c3aed] to-[#a855f7] bg-clip-text text-transparent">
              Verify Authenticity.
            </span>
            <br />
            Protect Trust.
          </h1>
          <p className="text-base sm:text-lg max-w-[560px] mx-auto mb-8 sm:mb-9 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Decod3X helps detect AI-generated content, verify digital authenticity, and protect businesses from synthetic media risks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-10">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-7 py-3.5 rounded-lg text-base font-semibold no-underline hover:shadow-[0_0_28px_var(--accent-glow)] sm:hover:scale-[1.03] transition-all inline-flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Start detecting
            </Link>
            <a
              href="#how-it-works"
              className="text-white px-7 py-3.5 rounded-lg text-base font-semibold no-underline border border-[rgba(124,58,237,0.5)] hover:bg-[var(--accent-glow)] hover:border-[var(--accent-light)] transition-all inline-flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              See how it works
            </a>
          </div>
          <div className="flex gap-x-5 gap-y-3 justify-center flex-wrap">
            {["99.4% accuracy", "<200ms response", "SOC 2 compliant"].map((stat) => (
              <div key={stat} className="text-[13px] sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-light)] flex-shrink-0" />
                {stat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="section-y" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">How It Works</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Detection in Three Simple Steps</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>From upload to detailed report in seconds. No expertise required.</p></Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 mt-10 sm:mt-16 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed" style={{ borderColor: "rgba(124,58,237,0.35)" }} />
            {[
              { n: "01", title: "Submit Content", desc: "Upload text, images, or media for instant analysis. Supports documents, images, audio, and video formats." },
              { n: "02", title: "AI Analysis", desc: "Our engine scans for AI-generation patterns, deepfake signals, and anomalies using industry-leading models." },
              { n: "03", title: "Get Report", desc: "Receive a detailed authenticity report with confidence scores, risk flags, and actionable insights." },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1} className="text-center px-2 sm:px-8 relative z-[1]">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full inline-flex items-center justify-center text-lg sm:text-[22px] font-extrabold text-[var(--accent-light)] mb-4 sm:mb-6 border-2"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(168,85,247,0.15))",
                    borderColor: "rgba(124,58,237,0.45)",
                  }}
                >
                  {step.n}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="section-y">
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">Features</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Built for Accuracy. Built for Scale.</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>Everything your team needs to detect, verify, and act — all in one platform.</p></Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-10 sm:mt-16">
            {[
              { icon: "🎯", title: "High-Accuracy Detection", desc: "Industry-leading models trained on billions of samples deliver >99% detection accuracy across text and media. No false alarm fatigue." },
              { icon: "⚡", title: "Real-Time API", desc: "Integrate detection into your workflow via REST API. Get results in milliseconds with enterprise-grade uptime and full SDK support." },
              { icon: "📊", title: "Team Dashboard", desc: "Centralized audit logs, team management, and analytics so your entire organization stays protected and compliance-ready." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-6 sm:p-8 border relative overflow-hidden h-full hover-lift"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#7c3aed] to-[#a855f7] rounded-t-2xl" />
                  <div
                    className="w-[52px] h-[52px] rounded-xl flex items-center justify-center mb-5 text-[22px] border"
                    style={{
                      background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(168,85,247,0.15))",
                      borderColor: "rgba(124,58,237,0.3)",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BENTO SHOWCASE ═══ */}
      <section id="showcase" className="section-y" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">Capabilities</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Detection Across Every Surface</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>From text to deepfakes, Decod3X covers every attack vector in the AI authenticity landscape.</p></Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mt-10 sm:mt-16">
            {[
              { icon: "📝", title: "AI Text Detection", desc: "Detect ChatGPT, Claude, Gemini, and other LLM-generated content with surgical precision. Works across languages and domains.", link: "Learn More" },
              { icon: "🎭", title: "Deepfake Risk Signals", desc: "Surface synthetic faces, voice clones, and manipulated media before they cause harm. Real-time video and audio analysis.", link: "Explore" },
              { icon: "🔍", title: "Plagiarism & Similarity", desc: "Go beyond copy-paste. Detect paraphrased AI content, semantic similarity, and attribution gaps across your document corpus.", link: "See How" },
              { icon: "🏢", title: "Enterprise API", desc: "Scale detection across millions of documents per day. Built for trust, compliance, and speed with dedicated infrastructure.", link: "Get Access" },
            ].map((b, i) => (
              <Reveal key={b.title} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-6 sm:p-10 min-h-[220px] sm:min-h-[260px] border flex flex-col justify-between relative overflow-hidden h-full hover-lift group"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div>
                    <span className="text-4xl block mb-4">{b.icon}</span>
                    <h3 className="text-lg sm:text-[22px] font-bold mb-3">{b.title}</h3>
                    <p className="text-[15px] leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>{b.desc}</p>
                  </div>
                  <Link href="/auth/signup" className="inline-flex items-center gap-1.5 text-[var(--accent-light)] text-sm font-semibold no-underline group-hover:gap-2.5 transition-all">
                    {b.link}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="section-y">
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">Pricing</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Simple, Transparent Pricing</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>Start free. Scale when you&apos;re ready. No surprise charges.</p></Reveal>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-10 sm:mt-12 mb-12 sm:mb-16 flex-wrap">
            <span className="hidden sm:inline text-[15px] font-medium" style={{ color: "var(--text-secondary)" }}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              role="switch"
              aria-checked={isYearly}
              aria-label="Toggle yearly billing"
              className="relative w-36 sm:w-40 h-11 rounded-full border cursor-pointer flex flex-shrink-0"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div
                className="absolute top-1 left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] rounded-full transition-transform duration-300"
                style={{
                  background: "var(--gradient)",
                  boxShadow: "0 0 12px var(--accent-glow)",
                  transform: isYearly ? "translateX(100%)" : "translateX(0)",
                }}
              />
              <div className="flex-1 flex items-center justify-center text-[13px] font-semibold z-[1] transition-colors" style={{ color: !isYearly ? "#fff" : "var(--text-secondary)" }}>Monthly</div>
              <div className="flex-1 flex items-center justify-center text-[13px] font-semibold z-[1] transition-colors" style={{ color: isYearly ? "#fff" : "var(--text-secondary)" }}>Yearly</div>
            </button>
            <span className="text-[13px] sm:text-[15px] font-medium" style={{ color: "var(--text-secondary)" }}>
              <span className="hidden sm:inline">Yearly </span>
              <span className="bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">Save 20%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <Reveal>
              <div
                className="rounded-2xl p-6 sm:p-9 border h-full hover-lift"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="text-[13px] font-bold tracking-[0.1em] uppercase text-[var(--accent-light)] mb-3">Free</div>
                <div className="mb-2">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">$0</span>
                  <span className="text-base ml-1" style={{ color: "var(--text-secondary)" }}>/mo</span>
                </div>
                <p className="text-sm mb-7 min-h-[42px]" style={{ color: "var(--text-secondary)" }}>Free forever. No credit card required.</p>
                <div className="h-px mb-6" style={{ background: "var(--border)" }} />
                <ul className="list-none mb-8 space-y-2">
                  {["1 free scan to start", "AI Image Detection", "Basic authenticity reports", "Dashboard access", "Email support"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm py-1" style={{ color: "var(--text-secondary)" }}>
                      <span className="text-[var(--accent-light)] font-bold flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full text-center py-3.5 rounded-lg text-[15px] font-semibold border no-underline text-white hover:bg-[var(--accent-glow)] hover:border-[var(--accent-light)] transition-all"
                  style={{ borderColor: "rgba(124,58,237,0.45)" }}
                >
                  Get Started Free
                </Link>
              </div>
            </Reveal>

            {/* Pro */}
            <Reveal delay={0.1}>
              <div
                className="rounded-2xl p-6 sm:p-9 border relative h-full hover-lift mt-4 md:mt-0"
                style={{ background: "var(--bg-card)", borderColor: "rgba(124,58,237,0.6)", boxShadow: "0 0 40px rgba(124,58,237,0.2)" }}
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  ⭐ Most Popular
                </div>
                <div className="text-[13px] font-bold tracking-[0.1em] uppercase text-[var(--accent-light)] mb-3">Pro</div>
                <div className="mb-2">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">{isYearly ? "$23" : "$29"}</span>
                  <span className="text-base ml-1" style={{ color: "var(--text-secondary)" }}>/mo</span>
                </div>
                <p className="text-sm mb-7 min-h-[42px]" style={{ color: "var(--text-secondary)" }}>
                  {isYearly ? "Billed Yearly. Save 20% annually." : "Billed Monthly. Everything you need for serious detection."}
                </p>
                <div className="h-px mb-6" style={{ background: "var(--border)" }} />
                <ul className="list-none mb-8 space-y-2">
                  {["200 credits/month", "Image & video detection", "Real-time API (10k calls/day)", "Team dashboard (5 seats)", "Priority support", "Advanced analytics"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm py-1" style={{ color: "var(--text-secondary)" }}>
                      <span className="text-[var(--accent-light)] font-bold flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full text-center py-3.5 rounded-lg text-[15px] font-semibold bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white no-underline hover:shadow-[0_0_24px_var(--accent-glow)] hover:brightness-110 hover:scale-[1.02] transition-all border-none"
                >
                  Start Pro Trial
                </Link>
              </div>
            </Reveal>

            {/* Enterprise */}
            <Reveal delay={0.2}>
              <div
                className="rounded-2xl p-6 sm:p-9 border h-full hover-lift"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="text-[13px] font-bold tracking-[0.1em] uppercase text-[var(--accent-light)] mb-3">Enterprise</div>
                <div className="mb-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">Custom</span>
                </div>
                <p className="text-sm mb-7 min-h-[42px]" style={{ color: "var(--text-secondary)" }}>Tailored for your organization&apos;s scale and compliance needs.</p>
                <div className="h-px mb-6" style={{ background: "var(--border)" }} />
                <ul className="list-none mb-8 space-y-2">
                  {["All Pro features", "Dedicated infrastructure", "Custom AI models", "SLA guarantee", "Audit logs & compliance exports", "24/7 dedicated support", "Onboarding & training"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm py-1" style={{ color: "var(--text-secondary)" }}>
                      <span className="text-[var(--accent-light)] font-bold flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full text-center py-3.5 rounded-lg text-[15px] font-semibold border no-underline text-white hover:bg-[var(--accent-glow)] hover:border-[var(--accent-light)] transition-all"
                  style={{ borderColor: "rgba(124,58,237,0.45)" }}
                >
                  Contact Sales
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ INTEGRATIONS ═══ */}
      <section id="integrations" className="section-y" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">Integrations</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Works With Your Stack</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>Plug Decod3X into the tools your team already uses. Zero disruption, maximum protection.</p></Reveal>
          </div>
        </div>
        <div className="overflow-hidden mt-10 sm:mt-12 marquee-track mask-fade-x">
          <div className="flex gap-4 w-max animate-marquee-integrations">
            {[...integrations, ...integrations].map((pill, i) => (
              <div
                key={i}
                className="rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm font-semibold whitespace-nowrap flex items-center gap-2 border hover:border-[rgba(124,58,237,0.5)] hover:text-white transition-all"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                {pill}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" className="section-y overflow-hidden">
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">Testimonials</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Trusted by Teams Worldwide</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>From media companies to legal firms — Decod3X protects the people who need it most.</p></Reveal>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:gap-5 mt-10 sm:mt-16">
          <div className="overflow-hidden marquee-track mask-fade-x">
            <div className="flex gap-5 w-max animate-marquee-left">
              {[...testimonials1, ...testimonials1].map((t, i) => (
                <TestimonialCard key={i} {...t} />
              ))}
            </div>
          </div>
          <div className="overflow-hidden marquee-track mask-fade-x">
            <div className="flex gap-5 w-max animate-marquee-right">
              {[...testimonials2, ...testimonials2].map((t, i) => (
                <TestimonialCard key={i} {...t} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOUNDERS ═══ */}
      <section id="founders" className="section-y">
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">The Team</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Built by Believers in Digital Trust</h2></Reveal>
            <Reveal delay={0.2}>
              <p className="text-base sm:text-lg max-w-[680px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Decod3X was born from a simple conviction: as AI-generated content floods the internet, the world needs a reliable way to tell what&apos;s real. Our mission is to give every individual, business, and institution the tools to verify authenticity — before trust is broken.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-10 sm:mt-16 max-w-[860px] mx-auto">
            {/* Angelo Bonnici */}
            <Reveal delay={0.1}>
              <div
                className="rounded-2xl p-6 sm:p-8 border relative overflow-hidden h-full hover-lift"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#7c3aed] to-[#a855f7] rounded-t-2xl" />
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
                  >
                    AB
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Angelo Bonnici</h3>
                    <p className="text-sm" style={{ color: "var(--accent-light)" }}>Co-Founder &amp; CEO</p>
                  </div>
                </div>
                <p className="text-[15px] leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
                  Angelo leads product vision and strategy at Decod3X. With a deep passion for AI safety and digital integrity, he set out to build the detection layer the internet was missing — making it accessible to everyone, not just enterprises.
                </p>
                <a
                  href="https://www.linkedin.com/in/angelo-bonnici-500b823aa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold no-underline px-4 py-2 rounded-lg border transition-all hover:bg-[rgba(124,58,237,0.15)] hover:border-[rgba(124,58,237,0.6)]"
                  style={{ borderColor: "rgba(124,58,237,0.35)", color: "var(--accent-light)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>
            </Reveal>

            {/* Co-Founder */}
            <Reveal delay={0.2}>
              <div
                className="rounded-2xl p-6 sm:p-8 border relative overflow-hidden h-full hover-lift"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#a855f7] to-[#7c3aed] rounded-t-2xl" />
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
                  >
                    SE
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Shayan Ejaz</h3>
                    <p className="text-sm" style={{ color: "var(--accent-light)" }}>Co-Founder &amp; CTO</p>
                  </div>
                </div>
                <p className="text-[15px] leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
                  Shayan architects the AI detection engine behind Decod3X. Driven by a belief that powerful technology should be responsible by default, he built the systems that make real-time, high-accuracy detection possible at scale.
                </p>
                <span
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border"
                  style={{ borderColor: "rgba(124,58,237,0.2)", color: "var(--text-secondary)" }}
                >
                  🔧 Engineering &amp; AI
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="section-y" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10 lg:gap-20 items-start">
            <div>
              <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">FAQ</span></Reveal>
              <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">Got Questions?<br />We&apos;ve Got Answers.</h2></Reveal>
              <Reveal delay={0.2}>
                <p className="text-lg leading-relaxed mt-4" style={{ color: "var(--text-secondary)" }}>
                  Everything you need to know about Decod3X. Can&apos;t find what you&apos;re looking for?{" "}
                  <a href="#footer" className="text-[var(--accent-light)] no-underline">Contact us.</a>
                </p>
              </Reveal>
            </div>
            <div>
              {faqs.map((faq, i) => (
                <FaqItem key={i} q={faq.q} a={faq.a} id={String(i)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BLOG ═══ */}
      <section id="blog" className="section-y">
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="text-center">
            <Reveal><span className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">Insights</span></Reveal>
            <Reveal delay={0.1}><h2 className="text-[clamp(26px,5.5vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">From the Decod3X Blog</h2></Reveal>
            <Reveal delay={0.2}><p className="text-base sm:text-lg max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>Expert takes on AI detection, digital trust, and the evolving synthetic media landscape.</p></Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-10 sm:mt-16">
            {[
              { icon: "📰", date: "May 1, 2026 · 5 min read", title: "The Rise of AI-Generated Misinformation: What Businesses Must Know" },
              { icon: "🎭", date: "Apr 18, 2026 · 6 min read", title: "How Deepfake Detection Works Under the Hood" },
              { icon: "🏛️", date: "Mar 30, 2026 · 4 min read", title: "Building an AI Authenticity Policy for Your Organization" },
            ].map((post, i) => (
              <Reveal key={post.title} delay={i * 0.1}>
                <a
                  href="#blog"
                  className="rounded-2xl border overflow-hidden no-underline flex flex-col h-full hover-lift group"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="h-[140px] sm:h-[180px] relative overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(168,85,247,0.15) 100%)" }}>
                    <span className="text-5xl opacity-70">{post.icon}</span>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom right, rgba(124,58,237,0.4), rgba(8,8,16,0.3))" }} />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="text-xs text-[var(--accent-light)] font-semibold uppercase tracking-wider mb-3">{post.date}</div>
                    <div className="text-[17px] font-bold leading-snug mb-3 flex-grow">{post.title}</div>
                    <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent-light)] group-hover:gap-2.5 transition-all">
                      Read Article
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                    </div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section
        className="section-y text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(168,85,247,0.1) 50%, rgba(8,8,16,1) 100%), linear-gradient(to bottom, var(--bg-primary), var(--bg-secondary))",
        }}
      >
        <div className="absolute w-[800px] h-[800px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 60%)" }} />
        <div className="relative z-[1] max-w-[1200px] mx-auto gutter">
          <Reveal><h2 className="text-[clamp(28px,6vw,52px)] font-extrabold tracking-tight mb-4 text-balance">Ready to Protect Your Business?</h2></Reveal>
          <Reveal delay={0.1}><p className="text-base sm:text-lg max-w-[500px] mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>Sign up free and run your first detection in under 60 seconds. No credit card required.</p></Reveal>
          <Reveal delay={0.2}>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-7 py-3.5 rounded-lg text-base font-semibold no-underline hover:shadow-[0_0_28px_var(--accent-glow)] hover:scale-[1.03] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Start Free Detection
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer id="footer" className="border-t py-12 sm:py-16 pb-safe" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto gutter">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 mb-10 sm:mb-12">
            <div>
              <Logo size={36} className="mb-4" />
              <p className="text-sm leading-relaxed max-w-[240px]" style={{ color: "var(--text-secondary)" }}>
                Detect AI. Verify Authenticity. Protect Trust.<br />Enterprise AI detection for the modern web.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                { title: "Product", links: [{ label: "How It Works", href: "#how-it-works" }, { label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "Capabilities", href: "#showcase" }] },
                { title: "Company", links: [{ label: "Blog", href: "#blog" }, { label: "Customers", href: "#testimonials" }, { label: "FAQs", href: "#faq" }, { label: "Contact", href: "#footer" }] },
                { title: "Legal", links: [{ label: "Privacy Policy", href: "#" }, { label: "Terms of Service", href: "#" }, { label: "Security", href: "#" }, { label: "Compliance", href: "#" }] },
              ].map((group) => (
                <div key={group.title}>
                  <h4 className="text-[13px] font-bold tracking-[0.1em] uppercase mb-4" style={{ color: "var(--text-secondary)" }}>{group.title}</h4>
                  <ul className="list-none flex flex-col gap-2.5">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="text-sm no-underline hover:text-white transition-colors" style={{ color: "var(--text-secondary)" }}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>© 2026 Decod3X. All rights reserved.</span>
            <div className="flex gap-6">
              {["Privacy Policy", "Terms", "Security"].map((link) => (
                <a key={link} href="#" className="text-[13px] no-underline hover:text-white transition-colors" style={{ color: "var(--text-secondary)" }}>{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
