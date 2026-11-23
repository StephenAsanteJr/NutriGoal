import "server-only";
// NutriGoal Assistant: an in-browser support agent for members.
// Runs Claude Opus 5.5 with the SDK tool runner; every tool is scoped to the
// signed-in member. Payments always go through the member's own checkout, and
// the assistant never gives medical advice (that's what goal tickets are for).
// Without AI credentials, a small keyword router handles the common requests.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AI_MODEL, FALLBACK_BETA, aiAvailable, claude } from "./ai";
import { db, newId, nowIso } from "./db";
import { computeBuild } from "./biometrics";
import {
  getActiveSubscription,
  getAddon,
  getProfile,
  listAddons,
  listPartners,
  listTicketsForMember,
  toBuildInput,
  type PartnerRow,
} from "./data";
import { nudgeClinician } from "./nudges";
import { unlockAddonFor } from "./fulfillment";
import { PARTNER_CATEGORIES, goalLabel, money, ticketNumber } from "./domain";
import type { User } from "./auth";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AgentAction = { type: "link"; label: string; href: string };
export type AgentReply = { reply: string; actions: AgentAction[]; ai: boolean };

const PAGES: Record<string, string> = {
  dashboard: "/dashboard",
  new_ticket: "/tickets/new",
  tickets: "/tickets",
  marketplace: "/marketplace",
  addons: "/marketplace#addons",
  membership: "/membership",
  progress: "/membership?tab=progress",
  settings: "/membership?tab=settings",
  character: "/membership?tab=settings#settings-character",
  update_build: "/onboarding/manual",
  upload_report: "/onboarding/upload",
  notifications: "/notifications",
};

const SYSTEM = `You are NutriGoal Assistant, the in-app support agent for NutriGoal, a nutrition platform where members send one goal at a time as a "goal ticket" and a licensed physician (MD) or registered dietitian (RD) writes back a response ticket within 48 hours.

What you can do, using your tools:
- Search the marketplace: verified partners (grocers, retailers, pharmacies, fitness coaches) and the top national grocers, food retailers and pharmacies. National brands are public listings, NOT NutriGoal partners; never imply a partnership, discount or endorsement for them.
- Save or remove a partner or store for the member (save_partner).
- List add-ons and unlock ones that are free for the member. Paid add-ons always need the member to pay in checkout themselves: give them the checkout link; never ask for card details in chat.
- Check the member's ticket status, and nudge the assigned clinician to review an open ticket when the member asks for an update, says it's taking long, or asks you to remind or chase the clinician. Nudges are rate-limited; report the tool's message honestly.
- Point the member to the right page with the navigate tool (it adds a button under your reply).

Rules:
- You are not a clinician. Don't diagnose, change medicines or give individual nutrition plans. For a health or nutrition question, say a clinician can answer it in a goal ticket and offer the new_ticket page. General app questions are fine.
- Only act on the member's own data, and only when they ask. Confirm what you did in one short sentence.
- Be brief and warm: 1-4 short sentences, or a short list when listing options. Plain text, no markdown headings.`;

function audit(userId: string, tool: string, input: unknown, result: string) {
  db()
    .prepare("INSERT INTO assistant_actions (id, user_id, tool, input_json, result, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(newId(), userId, tool, JSON.stringify(input), result.slice(0, 500), nowIso());
}

function partnerSummary(p: PartnerRow) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    type: p.kind === "national" ? "national brand (public listing, not a partner)" : "verified NutriGoal partner",
    tagline: p.tagline,
    offer: p.offer,
    note: p.rank_note ?? p.verification,
    saved: p.connected,
  };
}

function buildTools(user: User, actions: AgentAction[]) {
  const categories = PARTNER_CATEGORIES.map((c) => c.id) as [string, ...string[]];
  return [
    betaZodTool({
      name: "search_marketplace",
      description: "Search marketplace partners and national stores. Filter by category and/or a free-text query (name, product, need).",
      inputSchema: z.object({
        category: z.enum(categories).optional().describe("grocer, retailer (food retailers and gear), pharmacy, or coach"),
        query: z.string().optional().describe("Free text such as 'protein powder', 'GLP-1 refills', 'Walmart'"),
      }),
      run: async ({ category, query }) => {
        const q = (query ?? "").toLowerCase();
        const words = q.split(/\s+/).filter((w) => w.length > 2);
        const list = listPartners(user.id).filter((p) => {
          if (category && p.category !== category) return false;
          if (!words.length) return true;
          const hay = `${p.name} ${p.tagline} ${p.description} ${p.tags.join(" ")} ${p.goal_types.join(" ")}`.toLowerCase();
          return words.some((w) => hay.includes(w));
        });
        if (list.length) actions.push({ type: "link", label: category ? `Open ${PARTNER_CATEGORIES.find((c) => c.id === category)?.label}` : "Open marketplace", href: category ? `/marketplace?category=${category}` : "/marketplace" });
        return JSON.stringify(list.slice(0, 8).map(partnerSummary));
      },
    }),
    betaZodTool({
      name: "save_partner",
      description: "Save (connect) or remove a marketplace partner or national store for the member. Use the id from search_marketplace.",
      inputSchema: z.object({ partner_id: z.string(), save: z.boolean() }),
      run: async ({ partner_id, save }) => {
        const p = listPartners(user.id).find((x) => x.id === partner_id);
        if (!p) return "No partner with that id.";
        if (save && !p.connected) db().prepare("INSERT OR IGNORE INTO partner_connections (user_id, partner_id, connected_at) VALUES (?, ?, ?)").run(user.id, p.id, nowIso());
        if (!save && p.connected) db().prepare("DELETE FROM partner_connections WHERE user_id = ? AND partner_id = ?").run(user.id, p.id);
        const msg = `${p.name} ${save ? "saved" : "removed"}.`;
        audit(user.id, "save_partner", { partner_id, save }, msg);
        actions.push({ type: "link", label: `View ${p.name}`, href: `/marketplace?category=${p.category}#${p.id}` });
        return msg;
      },
    }),
    betaZodTool({
      name: "list_addons",
      description: "List add-ons the member can unlock, with price and whether each is already unlocked or included with membership.",
      inputSchema: z.object({}),
      run: async () => {
        const member = !!getActiveSubscription(user.id);
        return JSON.stringify(
          listAddons(user.id).map((a) => ({
            id: a.id,
            name: a.name,
            price: `${money(a.price_cents)}${a.interval === "month" ? "/month" : " one time"}`,
            unlocked: !!a.unlocked,
            free_for_member: !!a.included_with_membership && member,
            partner: a.partner_name,
            description: a.description,
          })),
        );
      },
    }),
    betaZodTool({
      name: "unlock_addon",
      description: "Unlock an add-on. Free/included add-ons unlock immediately; paid ones return a checkout link the member must complete themselves.",
      inputSchema: z.object({ addon_id: z.string() }),
      run: async ({ addon_id }) => {
        const a = getAddon(addon_id);
        if (!a) return "No add-on with that id.";
        const unlocked = db().prepare("SELECT 1 FROM user_addons WHERE user_id = ? AND addon_id = ?").get(user.id, a.id);
        if (unlocked) return `${a.name} is already unlocked.`;
        if (a.included_with_membership && getActiveSubscription(user.id)) {
          unlockAddonFor(user.id, a.id);
          audit(user.id, "unlock_addon", { addon_id }, "unlocked (included)");
          return `${a.name} unlocked at no charge (included with membership).`;
        }
        actions.push({ type: "link", label: `Checkout: ${a.name} (${money(a.price_cents)})`, href: `/marketplace?unlock=${a.id}#addon-${a.id}` });
        return `${a.name} costs ${money(a.price_cents)}${a.interval === "month" ? " a month" : ""}. The member must confirm and pay in checkout; a checkout button has been added under your reply.`;
      },
    }),
    betaZodTool({
      name: "get_my_tickets",
      description: "The member's goal tickets with status, assigned clinician and due time.",
      inputSchema: z.object({}),
      run: async () => {
        const nudges = db().prepare("SELECT ticket_id, COUNT(*) AS n FROM nudges WHERE member_id = ? GROUP BY ticket_id").all(user.id) as { ticket_id: number; n: number }[];
        const n = new Map(nudges.map((x) => [x.ticket_id, x.n]));
        return JSON.stringify(
          listTicketsForMember(user.id).map((t) => ({
            ticket_id: t.id,
            number: ticketNumber(t.id),
            goal: t.goal_statement,
            type: goalLabel(t.goal_type),
            status: t.status,
            clinician: t.clinician_name ? `${t.clinician_name}, ${t.clinician_credential}` : null,
            due_at: t.due_at,
            responded_at: t.responded_at,
            nudges: n.get(t.id) ?? 0,
          })),
        );
      },
    }),
    betaZodTool({
      name: "nudge_clinician",
      description: "Ask the assigned clinician to review an open (assigned or in review) ticket. Rate-limited to once every 6 hours per ticket.",
      inputSchema: z.object({ ticket_id: z.number().int(), note: z.string().max(240).optional().describe("Optional short note from the member") }),
      run: async ({ ticket_id, note }) => {
        const r = nudgeClinician({ ticketId: ticket_id, actor: user, source: "assistant", note });
        audit(user.id, "nudge_clinician", { ticket_id, note }, r.message);
        if (r.ok) actions.push({ type: "link", label: `View ${ticketNumber(ticket_id)}`, href: `/tickets/${ticket_id}` });
        return r.message;
      },
    }),
    betaZodTool({
      name: "get_my_summary",
      description: "The member's own build summary (goal, daily targets) and membership status, for answering app questions.",
      inputSchema: z.object({}),
      run: async () => {
        const p = getProfile(user.id);
        const input = toBuildInput(p);
        const b = input ? computeBuild(input) : null;
        const sub = getActiveSubscription(user.id);
        return JSON.stringify({
          name: user.name.split(" ")[0],
          membership: sub ? { plan: sub.plan, included_tickets_left: sub.ticket_credits } : "pay per ticket",
          build: b
            ? {
                goal_weight_kg: Math.round(b.goalWeightKg * 10) / 10,
                timeline_weeks: b.effectiveWeeks,
                daily_calorie_target: Math.round(b.targetCalories),
                protein_g: b.proteinG,
              }
            : "not completed",
        });
      },
    }),
    betaZodTool({
      name: "navigate",
      description: "Add a button under your reply that takes the member to a page.",
      inputSchema: z.object({
        page: z.enum(Object.keys(PAGES) as [string, ...string[]]),
        label: z.string().max(40).describe("Button text, e.g. 'Open a new ticket'"),
      }),
      run: async ({ page, label }) => {
        actions.push({ type: "link", label, href: PAGES[page] });
        return `Button added: ${label}`;
      },
    }),
  ];
}

export async function runAgent(user: User, history: ChatMessage[]): Promise<AgentReply> {
  const clean = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (clean.length && clean[0].role !== "user") clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== "user") return { reply: "How can I help?", actions: [], ai: aiAvailable() };

  if (!aiAvailable()) return fallbackAgent(user, clean[clean.length - 1].content);

  const actions: AgentAction[] = [];
  try {
    const final = await claude().beta.messages.toolRunner({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: buildTools(user, actions),
      messages: clean,
      max_iterations: 6,
    });
    if (final.stop_reason === "refusal") return { reply: "Sorry, I can't help with that one. A clinician can answer health questions in a goal ticket.", actions: [{ type: "link", label: "Open a goal ticket", href: "/tickets/new" }], ai: true };
    const text = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { reply: text || "Done.", actions: dedupe(actions), ai: true };
  } catch (e) {
    const fb = fallbackAgent(user, clean[clean.length - 1].content);
    const why = e instanceof Anthropic.RateLimitError ? "busy" : "unavailable";
    return { ...fb, reply: `${fb.reply}\n\n(The AI assistant is ${why} right now, so I used quick answers.)` };
  }
}

function dedupe(a: AgentAction[]) {
  const seen = new Set<string>();
  return a.filter((x) => (seen.has(x.href) ? false : (seen.add(x.href), true))).slice(0, 4);
}

// ---------- Keyword fallback (no AI configured) ----------
function fallbackAgent(user: User, text: string): AgentReply {
  const t = text.toLowerCase();
  const open = listTicketsForMember(user.id).filter((x) => x.status === "assigned" || x.status === "in_review");

  if (/\b(nudge|remind|chase|follow ?up|hurry|ping|taking (so )?long|speed)\b/.test(t)) {
    if (!open.length) return { reply: "You don't have an open ticket waiting on a clinician right now.", actions: [{ type: "link", label: "Your tickets", href: "/tickets" }], ai: false };
    const target = open.find((x) => t.includes(String(1000 + x.id))) ?? open[0];
    const r = nudgeClinician({ ticketId: target.id, actor: user, source: "assistant" });
    audit(user.id, "nudge_clinician", { ticket_id: target.id }, r.message);
    return { reply: r.message, actions: [{ type: "link", label: `View ${ticketNumber(target.id)}`, href: `/tickets/${target.id}` }], ai: false };
  }

  if (/\b(status|my tickets?|when will|response|answer(ed)?)\b/.test(t)) {
    const all = listTicketsForMember(user.id).filter((x) => x.status !== "awaiting_payment");
    if (!all.length) return { reply: "You haven't sent a goal ticket yet. Want to open one?", actions: [{ type: "link", label: "Open a goal ticket", href: "/tickets/new" }], ai: false };
    const lines = all.slice(0, 4).map((x) => `• ${ticketNumber(x.id)} — ${x.status === "responded" ? "response ready" : `with ${x.clinician_name}`}`);
    return { reply: `Here's where your tickets stand:\n${lines.join("\n")}\nSay "nudge my clinician" if one is taking a while.`, actions: [{ type: "link", label: "Your tickets", href: "/tickets" }], ai: false };
  }

  const cat = /pharmac|refill|prescription/.test(t) ? "pharmacy" : /coach|trainer|workout/.test(t) ? "coach" : /grocer|grocery|supermarket|food/.test(t) ? "grocer" : /retail|store|shop|gear|supplement|protein powder/.test(t) ? "retailer" : null;
  const partners = listPartners(user.id);
  const named = partners.find((p) => t.includes(p.name.toLowerCase().split(/[ ,]/)[0]) && p.name.length > 3);
  if (named && /\b(save|connect|add|use)\b/.test(t)) {
    db().prepare("INSERT OR IGNORE INTO partner_connections (user_id, partner_id, connected_at) VALUES (?, ?, ?)").run(user.id, named.id, nowIso());
    audit(user.id, "save_partner", { partner_id: named.id, save: true }, "saved");
    return { reply: `Saved ${named.name} to your marketplace.`, actions: [{ type: "link", label: `View ${named.name}`, href: `/marketplace?category=${named.category}#${named.id}` }], ai: false };
  }
  if (cat) {
    const list = partners.filter((p) => p.category === cat).slice(0, 6);
    const label = PARTNER_CATEGORIES.find((c) => c.id === cat)!.label.toLowerCase();
    return {
      reply: `Here are ${label} on NutriGoal:\n${list.map((p) => `• ${p.name}${p.kind === "national" ? " (national brand)" : " ✓ verified partner"}`).join("\n")}\nSay "save <name>" to add one to your profile.`,
      actions: [{ type: "link", label: `Open ${label}`, href: `/marketplace?category=${cat}` }],
      ai: false,
    };
  }

  if (/add-?ons?|unlock|support pack|lab panel|bundle|grocery list/.test(t)) {
    const member = !!getActiveSubscription(user.id);
    const addons = listAddons(user.id);
    return {
      reply: `Add-ons you can unlock:\n${addons.map((a) => `• ${a.name} — ${a.unlocked ? "unlocked" : a.included_with_membership && member ? "free with your membership" : money(a.price_cents) + (a.interval === "month" ? "/mo" : "")}`).join("\n")}`,
      actions: [{ type: "link", label: "See add-ons", href: "/marketplace#addons" }],
      ai: false,
    };
  }

  return {
    reply:
      "I can help with the marketplace (find grocers, pharmacies, coaches; save a store; unlock add-ons), check your tickets, and nudge your clinician if a response is taking a while. For nutrition or health questions, open a goal ticket so a clinician can answer.",
    actions: [
      { type: "link", label: "Marketplace", href: "/marketplace" },
      { type: "link", label: "Open a goal ticket", href: "/tickets/new" },
    ],
    ai: false,
  };
}
