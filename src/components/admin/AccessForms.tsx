"use client";

import { useFormState, useFormStatus } from "react-dom";
import { grantAdmin, revokeAdmin, type AccessResult } from "@/lib/admin-actions";

function Submit({ label, className = "btn", title }: { label: string; className?: string; title?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} title={title}>{pending ? "…" : label}</button>;
}

function Note({ state }: { state: AccessResult | null }) {
  if (!state) return null;
  return (
    <p style={{ margin: ".7rem 0 0", fontSize: ".82rem", color: state.ok ? "var(--good)" : "var(--bad)" }}>
      {state.message}
    </p>
  );
}

export function GrantForm({ domain }: { domain: string }) {
  const [state, action] = useFormState<AccessResult | null, FormData>(grantAdmin, null);
  return (
    <form action={action}>
      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          name="email" type="email" required autoComplete="off"
          placeholder={`name@${domain}`}
          style={{ flex: "1 1 16rem", minWidth: 0 }}
        />
        <Submit label="Grant access" className="btn btn-accent" />
      </div>
      <Note state={state} />
    </form>
  );
}

export function RevokeForm({ email }: { email: string }) {
  const [state, action] = useFormState<AccessResult | null, FormData>(revokeAdmin, null);
  return (
    <form action={action} style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: ".25rem" }}>
      <input type="hidden" name="email" value={email} />
      <Submit label="Remove" className="btn btn-ghost" title={`Remove ${email}`} />
      {state && !state.ok && <span style={{ fontSize: ".7rem", color: "var(--bad)", maxWidth: "18rem", textAlign: "right" }}>{state.message}</span>}
    </form>
  );
}
