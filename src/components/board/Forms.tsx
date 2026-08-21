"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { createTicket, postReply, toggleVote, type TicketResult } from "@/lib/ticket-actions";
import { CATEGORIES, KIND_META, MAX_BODY, MAX_SUBJECT, type Kind } from "@/lib/tickets";

function Submit({ label, className = "btn btn-accent" }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? "Sending…" : label}</button>;
}

function Note({ state }: { state: TicketResult | null }) {
  if (!state?.message) return null;
  return <p style={{ margin: ".6rem 0 0", fontSize: ".82rem", color: state.ok ? "var(--good)" : "var(--bad)" }}>{state.message}</p>;
}

type SessionOpt = { id: string; label: string };

export function Composer({ kind, sessions }: { kind: Kind; sessions: SessionOpt[] }) {
  const [state, action] = useFormState<TicketResult | null, FormData>(createTicket, null);
  const [category, setCategory] = useState(CATEGORIES[kind][0].key);
  const meta = KIND_META[kind];
  // The class picker only earns its place on an attendance dispute.
  const wantsClass = kind === "QUERY" && category === "attendance" && sessions.length > 0;
  // Per-kind id so the two tabs never share a toggle.
  const toggleId = `cmp-${kind.toLowerCase()}`;

  return (
    <form action={action} className="card">
      <input type="hidden" name="kind" value={kind} />

      {/* checkbox + label drive the mobile collapse; see .cmp-* in globals.css */}
      <input className="cmp-toggle" type="checkbox" id={toggleId} />
      <div className="eyebrow cmp-eyebrow">{meta.verb}</div>
      <label className="cmp-open" htmlFor={toggleId}>
        <span>{meta.ico} {meta.verb}</span>
        <span className="chev" aria-hidden>&#9662;</span>
      </label>

      <p className="cmp-blurb" style={{ color: "var(--muted)", fontSize: ".85rem", margin: ".5rem 0 1rem" }}>{meta.blurb}</p>

      <div className="cmp-fields">
        <label>
          <span className="code">Type</span>
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES[kind].map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>

        {wantsClass && (
          <label>
            <span className="code">Which class? <span style={{ color: "var(--faint)" }}>(optional - lets an admin fix it here)</span></span>
            <select name="sessionId" defaultValue="">
              <option value="">- not about one class -</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}

        <label>
          <span className="code">Title</span>
          <input name="subject" maxLength={MAX_SUBJECT} required
            placeholder={kind === "QUERY" ? "Marked absent for DT403 on 12 Aug" : "Show a weekly attendance summary"} />
        </label>

        <label>
          <span className="code">Details</span>
          <textarea name="body" rows={4} maxLength={MAX_BODY} required
            placeholder={kind === "QUERY" ? "What happened, and what you think it should say." : "What you'd like, and why it would help."} />
        </label>
      </div>

      <div className="cmp-submit" style={{ marginTop: "1rem" }}>
        <Submit label={meta.verb} />
        <Note state={state} />
      </div>
    </form>
  );
}

export function ReplyForm({ ticketId, placeholder = "Write a reply..." }: { ticketId: number; placeholder?: string }) {
  const [state, action] = useFormState<TicketResult | null, FormData>(postReply, null);
  const ref = useRef<HTMLFormElement>(null);
  // The action returns a fresh object each time, so a second successful send
  // still re-fires this and clears the box — otherwise the text lingers and
  // invites sending the same reply twice.
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form action={action} ref={ref}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea name="body" rows={3} maxLength={MAX_BODY} required placeholder={placeholder} style={{ width: "100%" }} />
      <div style={{ marginTop: ".6rem" }}><Submit label="Send" /></div>
      <Note state={state} />
    </form>
  );
}

export function VoteButton({ ticketId, votes, voted }: { ticketId: number; votes: number; voted: boolean }) {
  return (
    <form action={toggleVote}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <button
        className="btn"
        title={voted ? "Remove your backing" : "I want this too"}
        style={{
          padding: ".3rem .7rem", fontSize: ".76rem", display: "inline-flex", alignItems: "center", gap: ".35rem",
          color: voted ? "var(--accent)" : "var(--muted)",
          borderColor: voted ? "color-mix(in srgb, var(--accent) 45%, var(--edge))" : undefined,
        }}
      >
        <span aria-hidden>&#9650;</span>
        <span className="num">{votes}</span>
      </button>
    </form>
  );
}
