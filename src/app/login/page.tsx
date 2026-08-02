import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Login() {
  const session = await auth();
  if (session?.user) redirect("/");
  const demo = process.env.DEMO_MODE === "true";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="max-w-md mx-auto mt-16 card">
      <h1 className="text-xl font-semibold mb-1">ECAP Attendance Tracker</h1>
      <p className="text-neutral-400 text-sm mb-5">IIM Bodh Gaya · sign in with your @iimbg.ac.in account.</p>

      {hasGoogle && (
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <button className="btn btn-accent w-full mb-3">Sign in with Google</button>
        </form>
      )}

      {demo && (
        <form action={async (fd: FormData) => { "use server"; await signIn("credentials", { email: String(fd.get("email")), redirectTo: "/" }); }}
          className="border-t border-line pt-4 mt-2">
          <p className="text-xs text-neutral-500 mb-2">Demo bypass (before Google OAuth is set up): type <code>admin</code> for admin, or any <code>name@iimbg.ac.in</code> for a student view.</p>
          <div className="flex gap-2">
            <input name="email" placeholder="admin  or  name@iimbg.ac.in" className="flex-1 bg-ink border border-line rounded-lg px-3 py-1.5 text-sm" />
            <button className="btn">Enter</button>
          </div>
        </form>
      )}
      {!hasGoogle && !demo && <p className="text-bad text-sm">No auth provider configured. Set GOOGLE_CLIENT_ID or DEMO_MODE.</p>}
    </div>
  );
}
