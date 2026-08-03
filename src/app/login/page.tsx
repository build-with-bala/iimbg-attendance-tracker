import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { GridHero } from "@/components/GridHero";

export default async function Login() {
  const session = await auth();
  if (session?.user) redirect("/");
  const demo = process.env.DEMO_MODE === "true";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="landing">
      <GridHero />
      <div className="landing-inner">
        <header className="landing-top">
          <span className="l-mark">▦</span>
          <span className="l-brand">Register<span className="l-sub">IIM BODH GAYA · ECAP</span></span>
        </header>

        <div className="landing-hero">
          <div className="l-eyebrow">Attendance · Electives · Cohort</div>
          <h1 className="l-title">Know exactly<br />where you stand.</h1>
          <p className="l-lede">Track your electives, mark your own attendance, and see how you compare across the batch — one quiet register for the whole term.</p>

          <div className="l-card">
            {hasGoogle && (
              <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
                <button className="btn btn-accent l-cta">Continue with Google</button>
              </form>
            )}
            <div className="l-note">Sign in with your <span className="mono">@iimbg.ac.in</span> account.</div>
            {demo && (
              <form action={async (fd: FormData) => { "use server"; await signIn("credentials", { email: String(fd.get("email")), redirectTo: "/" }); }} className="l-demo">
                <div className="eyebrow" style={{ marginBottom: ".45rem" }}>Demo access</div>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <input name="email" placeholder="admin · name@iimbg.ac.in" style={{ flex: 1 }} />
                  <button className="btn">Enter</button>
                </div>
              </form>
            )}
          </div>

          <div className="l-feats">
            <Feat ico="◎" t="Your standing" d="Attendance ring, weekly trend, vs-class deltas." />
            <Feat ico="⇄" t="Compare peers" d="Subject overlap and side-by-side attendance." />
            <Feat ico="◇" t="Subject demand" d="How many opted each elective, and who." />
          </div>
        </div>

        <footer className="landing-foot">DBM · MBA · HHM — Terms IV / V / VI</footer>
      </div>

      <style>{`
        .landing { position: relative; min-height: 100dvh; overflow: hidden; }
        .grid-hero { position: fixed; inset: 0; width: 100vw; height: 100dvh; z-index: 0; display: block; }
        .landing-inner { position: relative; z-index: 1; min-height: 100dvh; display: flex; flex-direction: column; padding: clamp(1.1rem, 4vw, 2.4rem); }
        .landing-top { display: flex; align-items: center; gap: .6rem; }
        .l-mark { color: var(--accent); font-size: 1.3rem; }
        .l-brand { font-family: var(--font-space); font-weight: 700; font-size: 1.05rem; display: flex; flex-direction: column; line-height: 1; }
        .l-sub { font-family: var(--font-mono); font-weight: 400; font-size: .52rem; letter-spacing: .18em; color: var(--faint); margin-top: 3px; }
        .landing-hero { margin: auto 0; max-width: 620px; padding: 2rem 0; }
        .l-eyebrow { font-family: var(--font-mono); font-size: .7rem; letter-spacing: .24em; text-transform: uppercase; color: var(--accent-2); margin-bottom: 1.1rem; }
        .l-title { font-family: var(--font-space); font-weight: 700; font-size: clamp(2.2rem, 7vw, 3.6rem); line-height: 1.02; letter-spacing: -.03em; margin: 0; }
        .l-lede { color: var(--muted); font-size: clamp(.95rem, 2.4vw, 1.1rem); line-height: 1.55; margin: 1.1rem 0 1.8rem; max-width: 30rem; }
        .l-card { background: color-mix(in srgb, var(--surface) 72%, transparent); backdrop-filter: blur(14px); border: 1px solid var(--line); border-radius: 16px; padding: 1.3rem; max-width: 26rem; }
        .l-cta { width: 100%; padding: .7rem; font-size: .95rem; }
        .l-note { color: var(--faint); font-size: .8rem; text-align: center; margin-top: .7rem; }
        .l-demo { margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
        .l-feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8rem; margin-top: 2rem; max-width: 40rem; }
        .l-foot-note { }
        .landing-foot { font-family: var(--font-mono); font-size: .62rem; letter-spacing: .18em; text-transform: uppercase; color: var(--faint); margin-top: 2rem; }
        @media (max-width: 720px) { .l-feats { grid-template-columns: 1fr; gap: .5rem; } .l-card { max-width: none; } }
      `}</style>
    </div>
  );
}

function Feat({ ico, t, d }: { ico: string; t: string; d: string }) {
  return (
    <div style={{ border: "1px solid var(--line-soft)", borderRadius: 12, padding: ".8rem .9rem", background: "color-mix(in srgb, var(--surface) 45%, transparent)", backdropFilter: "blur(6px)" }}>
      <div style={{ color: "var(--accent-2)", fontSize: "1.1rem" }}>{ico}</div>
      <div style={{ fontFamily: "var(--font-space)", fontWeight: 600, fontSize: ".92rem", marginTop: ".3rem" }}>{t}</div>
      <div style={{ color: "var(--faint)", fontSize: ".76rem", marginTop: ".2rem", lineHeight: 1.4 }}>{d}</div>
    </div>
  );
}
