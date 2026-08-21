import Link from "next/link";

/** Admins live in two places, so both wear the same two-up switch rather than a
 *  stray link. `here` says which side is rendering it. Shows nothing for people
 *  who only have one workspace. */
export function WorkspaceSwitch({ here, appHref }: { here: "app" | "console"; appHref: string }) {
  return (
    <div className="wsw" role="group" aria-label="Switch workspace">
      <Link href={appHref} className={"wsw-it" + (here === "app" ? " wsw-on" : "")} aria-current={here === "app" ? "page" : undefined}>
        <span aria-hidden>◎</span><span className="wsw-lbl">App</span>
      </Link>
      <Link href="/admin" className={"wsw-it" + (here === "console" ? " wsw-on" : "")} aria-current={here === "console" ? "page" : undefined}>
        <span aria-hidden>▦</span><span className="wsw-lbl">Console</span>
      </Link>
    </div>
  );
}
