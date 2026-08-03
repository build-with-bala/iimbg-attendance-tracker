import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Login() {
  const session = await auth();
  if (session?.user) redirect("/");
  const demo = process.env.DEMO_MODE === "true";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand-row">
          <span className="mark">▦</span>
          <div>
            <div className="title">Register</div>
            <div className="eyebrow">IIM BODH GAYA · ECAP</div>
          </div>
        </div>
        <p className="lede">Track your electives, attendance, and where you stand across the cohort.</p>

        {hasGoogle && (
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
            <button className="btn btn-accent" style={{ width: "100%", padding: ".6rem", fontSize: ".9rem" }}>Continue with Google</button>
          </form>
        )}
        <div className="note">Use your <span className="mono">@iimbg.ac.in</span> account.</div>

        {demo && (
          <form action={async (fd: FormData) => { "use server"; await signIn("credentials", { email: String(fd.get("email")), redirectTo: "/" }); }} className="demo">
            <div className="eyebrow" style={{ marginBottom: ".5rem" }}>Demo access</div>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <input name="email" placeholder="admin  ·  name@iimbg.ac.in" style={{ flex: 1 }} />
              <button className="btn">Enter</button>
            </div>
          </form>
        )}
        {!hasGoogle && !demo && <p style={{ color: "var(--bad)" }}>No auth provider configured.</p>}
      </div>
      <div className="login-foot eyebrow">DBM · MBA · HHM — Terms IV / V / VI</div>
      <style>{`
        .login-wrap { min-height: 100vh; display: grid; place-content: center; gap: 1.2rem; padding: 2rem; }
        .login-card { width: min(400px, 92vw); background: linear-gradient(180deg, var(--surface-2), var(--surface)); border: 1px solid var(--line); border-radius: 18px; padding: 2rem 1.8rem; }
        .brand-row { display: flex; align-items: center; gap: .8rem; margin-bottom: 1.2rem; }
        .mark { font-size: 1.7rem; color: var(--accent); }
        .title { font-family: var(--font-space); font-weight: 700; font-size: 1.5rem; letter-spacing: -.02em; line-height: 1; }
        .lede { color: var(--muted); font-size: .92rem; margin: 0 0 1.4rem; line-height: 1.5; }
        .note { color: var(--faint); font-size: .78rem; text-align: center; margin-top: .7rem; }
        .demo { margin-top: 1.3rem; padding-top: 1.1rem; border-top: 1px solid var(--line); }
        .login-foot { text-align: center; }
      `}</style>
    </div>
  );
}
