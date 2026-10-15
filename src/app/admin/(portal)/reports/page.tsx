import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthYear, shortDate } from "@/lib/dates";
import { DOC_TYPES, type DocType } from "@/lib/records";
import { FACILITY_NAME } from "@/lib/facility";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports · Records office" };

type Req = {
  doc_type: DocType;
  status: string;
  created_at: string;
  due_at: string | null;
  documents: { released_at: string | null } | null;
};

const DAY = 86_400_000;
const WEEKS = 8;
const TARGET_DAYS = 3;

/** All the numbers, worked out outside the component (render purity). */
function compute(rows: Req[]) {
  const now = Date.now();
  const monthKey = new Date().toISOString().slice(0, 7);
  const released = rows
    .filter((r) => r.status === "released" && r.documents?.released_at)
    .map((r) => ({
      ...r,
      days: (new Date(r.documents!.released_at!).getTime() - new Date(r.created_at).getTime()) / DAY,
      onTime: !r.due_at || new Date(r.documents!.released_at!) <= new Date(r.due_at),
    }));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // Requests per week, newest week last.
  const weekStart = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d.getTime();
  };
  const thisWeek = weekStart(now);
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = thisWeek - (WEEKS - 1 - i) * 7 * DAY;
    return {
      start,
      count: rows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= start && t < start + 7 * DAY;
      }).length,
    };
  });

  return {
    thisMonth: rows.filter((r) => r.created_at.slice(0, 7) === monthKey).length,
    avgDays: avg(released.map((r) => r.days)),
    overdue: rows.filter(
      (r) => !["released", "declined"].includes(r.status) && r.due_at && new Date(r.due_at).getTime() < now,
    ).length,
    onTimePct: released.length ? Math.round((released.filter((r) => r.onTime).length / released.length) * 100) : null,
    weeks,
    byType: (Object.keys(DOC_TYPES) as DocType[]).map((t) => ({
      type: t,
      days: avg(released.filter((r) => r.doc_type === t).map((r) => r.days)),
    })),
  };
}

const fmt = (n: number | null, digits = 1) => (n === null ? "—" : n.toFixed(digits));

// design/AReports.html
export default async function ReportsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("doc_type, status, created_at, due_at, documents(released_at)")
    .order("created_at");
  const r = compute((data ?? []) as unknown as Req[]);
  const maxWeek = Math.max(1, ...r.weeks.map((w) => w.count));
  const maxDays = Math.max(TARGET_DAYS, ...r.byType.map((b) => b.days ?? 0));

  const cards = [
    { label: "Requests this month", value: String(r.thisMonth) },
    { label: "Avg. processing time", value: r.avgDays === null ? "—" : `${fmt(r.avgDays)} days` },
    { label: "Overdue requests", value: String(r.overdue), warn: r.overdue > 0 },
    { label: "Released on time", value: r.onTimePct === null ? "—" : `${r.onTimePct}%` },
  ];

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Reports</h1>
        <p className="mt-1 text-muted-foreground">
          {monthYear(new Date())} · {FACILITY_NAME} · processing time = created → released
        </p>
      </div>

      <div className="flex flex-wrap gap-3.5">
        {cards.map((c) => (
          <div key={c.label} className="flex flex-[1_1_180px] flex-col rounded-card border border-border bg-card p-4.5">
            <span className="text-sm text-muted-foreground">{c.label}</span>
            <span className={cn("font-heading text-4xl font-extrabold", c.warn && "text-attention-foreground")}>{c.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex flex-[1_1_360px] flex-col gap-3 rounded-card border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-bold">Requests per week</h2>
          {/* Plain SVG bars — no chart library. */}
          <svg
            viewBox={`0 0 ${WEEKS * 40} 160`}
            role="img"
            aria-label={`Requests per week: ${r.weeks.map((w) => `week of ${shortDate(new Date(w.start))} ${w.count}`).join(", ")}`}
            className="h-44 w-full"
            preserveAspectRatio="none"
          >
            {r.weeks.map((w, i) => {
              const h = (w.count / maxWeek) * 130;
              return (
                <g key={w.start}>
                  <rect x={i * 40 + 8} y={140 - h} width={24} height={Math.max(h, 1)} rx={4} className="fill-primary" />
                  <text x={i * 40 + 20} y={134 - h} textAnchor="middle" className="fill-foreground text-[10px] font-bold">
                    {w.count}
                  </text>
                </g>
              );
            })}
            <line x1="0" y1="140.5" x2={WEEKS * 40} y2="140.5" className="stroke-border" />
          </svg>
          <div className="grid text-center text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {r.weeks.map((w) => <span key={w.start}>{shortDate(new Date(w.start))}</span>)}
          </div>
        </section>

        <section className="flex flex-[1_1_320px] flex-col gap-3 rounded-card border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-bold">Avg. days to release, by type</h2>
          {r.byType.map((b) => {
            const over = (b.days ?? 0) > TARGET_DAYS;
            return (
              <div key={b.type} className="flex flex-col gap-1">
                <span className="flex justify-between text-sm">
                  <span>{DOC_TYPES[b.type]}</span>
                  <strong>{fmt(b.days)}</strong>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-tab-track">
                  <span
                    className={cn("block h-full rounded-full", over ? "bg-accent" : "bg-primary")}
                    style={{ width: `${((b.days ?? 0) / maxDays) * 100}%` }}
                  />
                </span>
              </div>
            );
          })}
          <p className="text-caption text-muted-foreground">Orange = above the {TARGET_DAYS}-day target.</p>
        </section>
      </div>
    </main>
  );
}
