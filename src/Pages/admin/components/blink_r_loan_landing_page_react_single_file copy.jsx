import React, { useState, useRef, useEffect } from "react";

export default function BlinkRHeroForm() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [confetti, setConfetti] = useState([]);
  const cardRef = useRef(null);
  const submitBtnRef = useRef(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOffset, setMobileOffset] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Enter your name";
    if (!form.email.trim()) errs.email = "Enter email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) errs.email = "Invalid email";
    if (!form.mobile.trim()) errs.mobile = "Enter mobile";
    else if (!/^[6-9]\d{9}$/.test(form.mobile)) errs.mobile = "Invalid mobile";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setStatus({ type: "loading", message: "Submitting…" });
      await new Promise((r) => setTimeout(r, 1000));
      setStatus({ type: "success", message: "Thank you! We’ll reach you shortly." });
      setForm({ name: "", email: "", mobile: "" });
      triggerConfetti();
    } catch (err) {
      setStatus({ type: "error", message: "Something went wrong" });
    }
  };

  const handleMouseMove = (e) => {
    const { innerWidth, innerHeight } = window;
    const nx = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const ny = (e.clientY - innerHeight / 2) / (innerHeight / 2);
    setMouse({ x: nx, y: ny });
    setCursor({ x: e.clientX, y: e.clientY });
    const rotateY = nx * 6;
    const rotateX = -ny * 6;
    setTilt({ x: rotateX, y: rotateY });
  };
  const createRipple = (e) => {
    if (!submitBtnRef.current) return;
    const rect = submitBtnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  const triggerConfetti = () => {
    const colors = ["#FDE68A", "#C4B5FD", "#FCA5A5", "#A5F3FC", "#6EE7B7"];
    const items = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      leftPct: 35 + Math.random() * 30,
      dx: (Math.random() * 2 - 1) * 140,
      rot: Math.floor(Math.random() * 360),
      delay: Math.random() * 0.15,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 1200);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => setMobileOffset(window.scrollY || window.pageYOffset || 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  return (
    <div onMouseMove={!isMobile ? handleMouseMove : undefined} className="min-h-screen bg-gradient-to-br from-brand-dark via-brand-hover to-[#071A33] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow shapes */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 bg-fuchsia-400/25 blur-3xl rounded-full animate-pulse" style={{ transform: isMobile ? `translate3d(0, ${-mobileOffset * 0.08}px, 0)` : `translate3d(${mouse.x * -12}px, ${mouse.y * -12}px, 0)` }} />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 bg-blue-500/20 blur-3xl rounded-full animate-ping" style={{ transform: isMobile ? `translate3d(0, ${mobileOffset * 0.06}px, 0)` : `translate3d(${mouse.x * 8}px, ${mouse.y * 10}px, 0)` }} />
      <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 h-[30rem] w-[30rem] sm:h-[34rem] sm:w-[34rem] bg-brand/20 blur-3xl rounded-full animate-pulse hidden sm:block" style={{ transform: isMobile ? `translate3d(0, ${-mobileOffset * 0.05}px, 0)` : `translate3d(${mouse.x * 16}px, ${mouse.y * -14}px, 0)` }} />

      {/* Cursor reactive glow */}
      {!isMobile && <div className="cursor-glow" style={{ transform: `translate(${cursor.x - 150}px, ${cursor.y - 150}px)` }} />}

      <div ref={cardRef} onMouseLeave={resetTilt} className="w-full rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 backdrop-blur-xl relative z-10 ring-1 ring-white/10 bg-white/5 aurora-card" style={{ transform: isMobile ? `translate3d(0, ${-mobileOffset * 0.05}px, 0)` : `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: "transform 180ms ease" }}>
        {/* Left Hero */}
        <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-center text-white bg-gradient-to-br from-brand-dark via-brand-muted to-brand-hover relative">
          {/* Aurora veil overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light aurora-veil" />
          <div className="flex items-center gap-3 mb-8">
            <img src="/images/product-logo.png" alt="Blink My Loan" className="h-10 w-auto rounded-xl bg-[#111111] p-1 shadow object-contain" />
            <span className="text-xs md:text-sm tracking-widest uppercase text-white/80">BlinkR Loans</span>
          </div>

          <span className="inline-flex w-max items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs md:text-sm text-white/90 ring-1 ring-white/20">
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            New‑age personal loans
          </span>

          <h1 className="mt-3 sm:mt-4 text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight drop-shadow-xl animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            Loan in a
            {" "}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-rose-300 bg-clip-text text-transparent animate-gradient-shift">Blink ₹</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-[15px] sm:text-base md:text-lg font-light max-w-xl text-white/90 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            RBI‑regulated fintech for salaried professionals. Fast approvals, transparent pricing, and a delightful experience.
          </p>

          <div className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-4 text-white/90 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-yellow-300 text-lg sm:text-xl drop-shadow glow-star">★</span>
              ))}
            </div>
            <span className="text-xs sm:text-sm">4.8/5 • Trusted by 10k+ users</span>
          </div>

          <ul className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] sm:text-sm text-white/90">
            <li className="flex items-center gap-2 animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5" style={{ animationDelay: "100ms" }}><span className="h-6 w-6 rounded-full bg-emerald-400/20 text-emerald-200 flex items-center justify-center">✓</span> Instant approval</li>
            <li className="flex items-center gap-2 animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5" style={{ animationDelay: "180ms" }}><span className="h-6 w-6 rounded-full bg-sky-400/20 text-sky-200 flex items-center justify-center">✓</span> Paperless KYC</li>
            <li className="flex items-center gap-2 animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5" style={{ animationDelay: "260ms" }}><span className="h-6 w-6 rounded-full bg-amber-400/20 text-amber-200 flex items-center justify-center">✓</span> No hidden charges</li>
            <li className="flex items-center gap-2 animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5" style={{ animationDelay: "340ms" }}><span className="h-6 w-6 rounded-full bg-fuchsia-400/20 text-fuchsia-200 flex items-center justify-center">✓</span> Secure & RBI compliant</li>
          </ul>

          <div className="mt-10 text-xs space-y-1 text-white/80">
            <p>✔️ Licensed by Reserve Bank of India</p>
            <p>✔️ Your data is safe with us (CIBIL Verified)</p>
          </div>
        </div>

        {/* Right Form */}
        <div id="application" className="p-6 sm:p-8 md:p-12 bg-white/95 relative">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center animate-fade-in-up">Start Your Application</h2>
          <p className="text-center text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 animate-fade-in-up" style={{ animationDelay: "80ms" }}>Takes less than 60 seconds</p>
          {status.type === "success" && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 text-sm text-center animate-fade-in-up">
              {status.message}
            </div>
          )}
          {status.type === "error" && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm text-center animate-fade-in-up">
              {status.message}
            </div>
          )}
          {/* Confetti burst */}
          {confetti.length > 0 && (
            <div className="pointer-events-none absolute left-0 right-0 top-6 mx-auto h-0 w-full" style={{ maxWidth: 560 }}>
              {confetti.map((c) => (
                <span
                  key={c.id}
                  className="confetti-piece"
                  style={{
                    left: `${c.leftPct}%`,
                    width: c.size,
                    height: c.size,
                    backgroundColor: c.color,
                    animationDelay: `${c.delay}s`,
                    "--dx": `${c.dx}px`,
                    "--rot": `${c.rot}deg`,
                  }}
                />
              ))}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 transition-all duration-300 focus:ring-2 focus:ring-brand focus:border-brand focus:shadow-lg focus:scale-[1.01] shadow-sm placeholder:text-gray-400"
                placeholder="Enter your full name as per PAN Card"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 transition-all duration-300 focus:ring-2 focus:ring-brand focus:border-brand focus:shadow-lg focus:scale-[1.01] shadow-sm placeholder:text-gray-400"
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Aadhaar Registered Mobile Number</label>
              <div className="flex mt-2 rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 focus-within:ring-2 focus-within:ring-brand focus-within:shadow-lg focus-within:scale-[1.01] shadow-sm">
                <span className="px-4 py-3 bg-gray-50 text-gray-600 border-r">+91</span>
                <input
                  type="tel"
                  name="mobile"
                  value={form.mobile}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                    handleChange({ target: { name: "mobile", value: next } });
                  }}
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="flex-1 px-4 py-3 outline-none"
                  placeholder="10‑digit mobile"
                />
              </div>
              {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>}
              <p className="mt-2 text-[11px] text-gray-500">We never share your number. OTP may be required.</p>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-link" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  Are you <span className="font-semibold text-brand-link">Salaried</span> or <span className="font-semibold text-brand-link">Self Employed</span>?
                </span>
              </label>
              <div className="flex items-center gap-6 justify-center mt-3">
                <label className="relative flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="employmentType"
                    value="salaried"
                    className="peer sr-only"
                    // onChange={handleChange} // Uncomment if you want to store in form state
                  />
                  <span className="w-5 h-5 rounded-full border-2 border-brand flex items-center justify-center transition-all duration-300 peer-checked:border-brand-hover peer-checked:shadow-lg bg-white group-hover:border-brand">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand opacity-0 peer-checked:opacity-100 transition-all duration-300"></span>
                  </span>
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-brand-link transition-colors duration-200">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" />
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                      Salaried
                    </span>
                  </span>
                </label>
                <label className="relative flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="employmentType"
                    value="self_employed"
                    className="peer sr-only"
                    // onChange={handleChange} // Uncomment if you want to store in form state
                  />
                  <span className="w-5 h-5 rounded-full border-2 border-brand flex items-center justify-center transition-all duration-300 peer-checked:border-brand-hover peer-checked:shadow-lg bg-white group-hover:border-brand">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand opacity-0 peer-checked:opacity-100 transition-all duration-300"></span>
                  </span>
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-brand-link transition-colors duration-200">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                      Self Employed
                    </span>
                  </span>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">
                This helps us personalize your loan experience ✨
              </p>
            </div>

            <button
              type="submit"
              disabled={status.type === "loading"}
              ref={submitBtnRef}
              onClick={createRipple}
              className="relative w-full bg-gradient-to-r from-brand-dark to-brand-dark text-brand-dark py-4 rounded-2xl font-bold shadow-xl ring-1 ring-brand/30 hover:from-brand-hover hover:to-brand-hover transition-transform hover:scale-[1.01] disabled:opacity-70 overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine" />
              {ripples.map((r) => (
                <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />
              ))}
              {status.type === "loading" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Submitting…
                </span>
              ) : (
                "Apply Now"
              )}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] sm:text-xs text-gray-600">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-center transition-transform duration-300 hover:-translate-y-0.5">🔒 256‑bit SSL</div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-center transition-transform duration-300 hover:-translate-y-0.5">📊 CIBIL Verified</div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-center transition-transform duration-300 hover:-translate-y-0.5">🚫 No spam policy</div>
          </div>

          <p className="mt-6 text-[11px] text-gray-500 text-center">
            By submitting, you agree to be contacted via phone, email, or WhatsApp.
          </p>
        </div>
      </div>

      {/* Floating decorative particles */}
      <div className="pointer-events-none absolute inset-0 -z-0 hidden sm:block">
        <span className="absolute top-24 left-10 h-2 w-2 rounded-full bg-pink-400/70 animate-float-slow" />
        <span className="absolute top-48 left-1/2 h-1.5 w-1.5 rounded-full bg-yellow-300/80 animate-float-slower" />
        <span className="absolute bottom-28 right-24 h-2 w-2 rounded-full bg-cyan-300/80 animate-float-slow" />
        <span className="absolute bottom-10 left-1/4 h-1.5 w-1.5 rounded-full bg-brand/40/80 animate-float-slower" />
        <span className="absolute top-1/3 right-10 h-1.5 w-1.5 rounded-full bg-brand/40/80 animate-float-slow" />
      </div>

      {/* Scoped animations */}
      <style>{`
        @keyframes floatYSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes glowPulse { 0%,100% { filter: drop-shadow(0 0 0px rgba(255,255,255,0.0)); } 50% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.35)); } }
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shine { 0% { transform: translateX(0) skewX(-12deg); } 100% { transform: translateX(300%) skewX(-12deg); } }
        @keyframes auroraFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes confettiPop { 0% { transform: translate(0, 0) scale(0.6) rotate(0); opacity: 1; } 60% { opacity: 1; } 100% { transform: translate(var(--dx), 240px) scale(1) rotate(var(--rot)); opacity: 0; } }
        @keyframes rippleScale { from { transform: translate(-50%, -50%) scale(0); opacity: .45; } to { transform: translate(-50%, -50%) scale(7); opacity: 0; } }

        .animate-float-slow { animation: floatYSlow 8s ease-in-out infinite; }
        .animate-float-slower { animation: floatYSlow 12s ease-in-out infinite; }
        .animate-gradient-shift { background-size: 200% 200%; animation: gradientShift 8s ease infinite; }
        .animate-glow { animation: glowPulse 3s ease-in-out infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out both; }
        .animate-shine { animation: shine 2s linear infinite; }
        .glow-star { animation: glowPulse 2.4s ease-in-out infinite; }
        .aurora-card:before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 1.5rem;
          padding: 1px;
          background: linear-gradient(120deg, rgba(236,72,153,0.6), rgba(168,85,247,0.6), rgba(59,130,246,0.6));
          background-size: 200% 200%;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: auroraFlow 6s linear infinite;
          pointer-events: none;
        }
        .confetti-piece {
          position: absolute;
          top: 0;
          border-radius: 9999px;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.04);
          animation: confettiPop 0.9s ease-out forwards;
        }
        .cursor-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 9999px;
          background: radial-gradient(circle at center, rgba(168,85,247,0.35), rgba(168,85,247,0) 60%);
          filter: blur(20px);
          mix-blend-mode: screen;
          pointer-events: none;
          transition: transform 80ms linear;
        }
        .aurora-veil {
          background: radial-gradient(1000px 400px at 10% 10%, rgba(255,255,255,0.12), transparent 60%),
                      radial-gradient(800px 400px at 90% 20%, rgba(192,132,252,0.18), transparent 60%),
                      linear-gradient(120deg, rgba(236,72,153,0.25), rgba(59,130,246,0.25));
          background-size: 200% 100%;
          animation: gradientShift 16s ease-in-out infinite;
        }
        .ripple {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: radial-gradient(circle at center, rgba(255,255,255,0.6), rgba(255,255,255,0.05));
          transform: translate(-50%, -50%);
          animation: rippleScale 600ms ease-out forwards;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow, .animate-float-slower, .animate-gradient-shift, .animate-glow,
          .animate-fade-in-up, .animate-shine, .cursor-glow, .glow-star, .aurora-card:before,
          .aurora-veil, .confetti-piece, .ripple { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
