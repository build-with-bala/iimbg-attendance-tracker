import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { GridHero } from "@/components/GridHero";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function Login() {
  const session = await auth();
  if (session?.user) redirect("/");
  const demo = process.env.DEMO_MODE === "true";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="landing">
      <GridHero />
      <div className="landing-inner">
        <header className="l-top">
          <span className="brand"><span className="l-mark">▦</span><span className="l-name">Register<span className="l-sub">IIM BODH GAYA · ECAP</span></span></span>
          <ThemeToggle />
        </header>

        <div className="l-hero">
          <div className="eyebrow" style={{ color: "var(--accent-2)" }}>Attendance · Electives · Cohort</div>
          <h1 className="l-title">Know exactly<br />where you stand.</h1>
          <p className="l-lede">Track your electives, mark your own attendance, and see how you compare across the batch — one calm register for the whole term.</p>

          <div className="card l-card">
            {hasGoogle && (
              <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
                <button className="btn btn-accent" style={{ width: "100%", padding: ".75rem", fontSize: ".95rem" }}>Continue with Google</button>
              </form>
            )}
            <div className="l-note">Sign in with your <span className="mono">@iimbg.ac.in</span> account.</div>
            {demo && (
              <form action={async (fd: FormData) => { "use server"; await signIn("credentials", { email: String(fd.get("email")), redirectTo: "/" }); }} className="l-demo">
                <div className="eyebrow" style={{ marginBottom: ".5rem" }}>Demo access</div>
                <div style={{ display: "flex", gap: ".5rem" }}><input name="email" placeholder="admin · name@iimbg.ac.in" style={{ flex: 1 }} /><button className="btn">Enter</button></div>
              </form>
            )}
          </div>

          <div className="l-feats">
            <Feat ico="◎" t="Your standing" d="Attendance dial, weekly trend, vs-class deltas." />
            <Feat ico="⇄" t="Compare peers" d="Subject overlap and side-by-side attendance." />
            <Feat ico="◇" t="Subject demand" d="How many opted each elective, and who." />
          </div>
        </div>

        <footer className="eyebrow l-foot">Digital Business Management · Business Administration · Hospital &amp; Health Management</footer>
      </div>

      <style>{`
        .landing { position: relative; min-height: 100dvh; overflow: hidden; }
        .grid-hero { position: fixed; inset: 0; width: 100vw; height: 100dvh; z-index: 0; display: block; }
        .landing-inner { position: relative; z-index: 1; min-height: 100dvh; display: flex; flex-direction: column; padding: clamp(1.1rem, 4vw, 2.4rem); }
        .l-top { display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: .6rem; }
        .l-mark { color: var(--accent); font-size: 1.35rem; }
        .l-name { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; display: flex; flex-direction: column; line-height: 1; }
        .l-sub { font-family: var(--font-mono); font-weight: 400; font-size: .52rem; letter-spacing: .18em; color: var(--faint); margin-top: 3px; }
        .l-hero { margin: auto 0; max-width: 620px; padding: 2rem 0; }
        .l-title { font-family: var(--font-display); font-weight: 700; font-size: clamp(2.3rem, 7vw, 3.7rem); line-height: 1.02; letter-spacing: -.03em; margin: 1.1rem 0 0; }
        .l-lede { color: var(--muted); font-size: clamp(.95rem, 2.4vw, 1.1rem); line-height: 1.55; margin: 1.1rem 0 1.9rem; max-width: 31rem; }
        .l-card { max-width: 26rem; }
        .l-note { color: var(--faint); font-size: .8rem; text-align: center; margin-top: .8rem; }
        .l-demo { margin-top: 1.2rem; padding-top: 1.1rem; border-top: 1px solid var(--divider); }
        .l-feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: .9rem; margin-top: 2.2rem; max-width: 42rem; }
        .l-foot { text-align: left; margin-top: 2rem; }
        @media (max-width: 720px) { .l-feats { grid-template-columns: 1fr; gap: .6rem; } .l-card { max-width: none; } }
      `}</style>
    </div>
  );
}

function Feat({ ico, t, d }: { ico: string; t: string; d: string }) {
  return (
    <div className="card-flat" style={{ padding: ".95rem 1rem" }}>
      <div style={{ color: "var(--accent-2)", fontSize: "1.15rem" }}>{ico}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: ".92rem", marginTop: ".35rem" }}>{t}</div>
      <div style={{ color: "var(--faint)", fontSize: ".76rem", marginTop: ".25rem", lineHeight: 1.4 }}>{d}</div>
    </div>
  );
}
