"use client";

/**
 * Loyalty program builder (#/merchant/program) — list + create/edit +
 * activate/pause + rewards manager. Config fields mirror src/lib/validation
 * schemas per type: POINTS / STAMPS / SERVICE_COUNT / STARS.
 */

import { useMemo, useState } from "react";
import { Check, Gift, Pause, Pencil, Play, Plus, Settings2, Ticket, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reveal, Spinner } from "@/components/customer/shared";
import {
  MerchantHeader,
  EmptyBlock,
  ErrorBlock,
  FieldLabel,
  FormError,
  MerchantCard,
  Micro,
  ProgramStatusChip,
  RowsSkeleton,
  type BusinessT,
  parseProgramConfig,
  type ProgramRowT,
} from "./shared";

/**
 * Launch scope (audit F06): every offered program type must complete the full
 * create → earn → redeem → approve loop. Only STAMPS and POINTS do today;
 * SERVICE_COUNT/STARS stay out of the creation UI until their mechanic exists.
 */
const TYPE_OPTIONS = [
  { value: "STAMPS", label: "Stamp card", blurb: "One stamp per visit — a free reward after N visits." },
  { value: "POINTS", label: "Points on spend", blurb: "Earn points per ₹100 spent at the counter." },
] as const;

type ProgramType = (typeof TYPE_OPTIONS)[number]["value"];

type ConfigDraft = {
  stampsToReward: string;
  pointsPerRupeePaise: string;
  servicesToReward: string;
  starsPerVisit: string;
  starsToReward: string;
};

const EMPTY_CONFIG: ConfigDraft = {
  stampsToReward: "5",
  pointsPerRupeePaise: "5",
  servicesToReward: "4",
  starsPerVisit: "1",
  starsToReward: "10",
};

function buildConfig(type: ProgramType, c: ConfigDraft): Record<string, number> | string {
  const int = (v: string) => Number.parseInt(v, 10);
  switch (type) {
    case "STAMPS":
      if (!Number.isInteger(int(c.stampsToReward)) || int(c.stampsToReward) < 2 || int(c.stampsToReward) > 50)
        return "Stamps for a reward must be between 2 and 50.";
      return { stampsPerVisit: 1, stampsToReward: int(c.stampsToReward) };
    case "POINTS":
      if (!Number.isInteger(int(c.pointsPerRupeePaise)) || int(c.pointsPerRupeePaise) < 1 || int(c.pointsPerRupeePaise) > 100)
        return "Points per ₹100 must be between 1 and 100.";
      return { pointsPerRupeePaise: int(c.pointsPerRupeePaise) };
  }
}

function configSummary(p: ProgramRowT): string {
  const c = parseProgramConfig(p.config);
  switch (p.type) {
    case "STAMPS":
      return `1 stamp per visit · reward at ${c.stampsToReward}`;
    case "POINTS":
      return `${c.pointsPerRupeePaise} pts per ₹100 spent`;
    case "SERVICE_COUNT":
      return `free service at ${c.servicesToReward} visits`;
    case "STARS":
      return `${c.starsPerVisit} star${Number(c.starsPerVisit) === 1 ? "" : "s"} per visit · reward at ${c.starsToReward}`;
    default:
      return p.name;
  }
}

export function ProgramsScreen({ business }: { business: BusinessT }) {
  const [programs, setPrograms] = useState<ProgramRowT[]>(business.programs);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramRowT | null>(null);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [rewardsFor, setRewardsFor] = useState<ProgramRowT | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const reload = async () => {
    try {
      const res = await api<{ programs: ProgramRowT[] }>("/api/merchant/program");
      setPrograms(res.programs);
    } catch {
      /* keep current list; banner shows on failed actions */
    }
  };

  const setStatus = async (p: ProgramRowT, status: "ACTIVE" | "PAUSED") => {
    setBusyId(p.id);
    setBanner(null);
    try {
      await api<{ program: ProgramRowT }>("/api/merchant/program", {
        method: "PUT",
        body: JSON.stringify({ id: p.id, status }),
      });
      await reload();
      setBanner({ kind: "ok", text: status === "ACTIVE" ? "Program is live — customers can earn now." : "Program paused." });
    } catch (e) {
      setBanner({ kind: "err", text: e instanceof ApiError ? e.message : "Couldn't update the program." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <MerchantHeader
        eyebrow="Loyalty"
        title="Your program"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            className="press h-10 rounded-full bg-forest px-4 text-sm font-semibold text-primary-foreground hover:bg-forest/90"
          >
            <Plus className="h-4 w-4" aria-hidden /> New program
          </Button>
        }
      />

      {banner && (
        <Reveal>
          <p
            role="status"
            className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              banner.kind === "ok"
                ? "border-forest/15 bg-lime-soft text-forest"
                : "border-destructive/25 bg-destructive/5 text-destructive"
            }`}
          >
            {banner.text}
          </p>
        </Reveal>
      )}

      {programs.length === 0 ? (
        <EmptyBlock
          icon={Ticket}
          title="No programs yet"
          line="A program decides how customers earn — stamps per visit or points per ₹100 — and what their balance can buy."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              className="press h-11 rounded-full bg-forest px-5 font-semibold"
            >
              <Plus className="h-4 w-4" aria-hidden /> Create your first program
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {programs.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <MerchantCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[15px] font-bold text-ink">{p.name}</h3>
                      <ProgramStatusChip status={p.status} />
                    </div>
                    <Micro className="mt-1">{configSummary(p)}</Micro>
                    {p.terms && <p className="mt-2 max-w-[60ch] text-[13px] leading-5 text-body">{p.terms}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full px-3 text-[13px] font-semibold"
                      onClick={() => {
                        setEditing(p);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                    </Button>
                    {p.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === p.id}
                        className="h-9 rounded-full px-3 text-[13px] font-semibold"
                        onClick={() => void setStatus(p, "PAUSED")}
                      >
                        {busyId === p.id ? <Spinner /> : <Pause className="h-3.5 w-3.5" aria-hidden />} Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busyId === p.id}
                        className="h-9 rounded-full bg-forest px-3 text-[13px] font-semibold"
                        onClick={() => void setStatus(p, "ACTIVE")}
                      >
                        {busyId === p.id ? <Spinner /> : <Play className="h-3.5 w-3.5" aria-hidden />} Activate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rewards */}
                <div className="mt-4 border-t border-forest/6 pt-4">
                  <div className="flex items-center justify-between">
                    <Micro>Rewards on this program</Micro>
                    <button
                      type="button"
                      onClick={() => {
                        setRewardsFor(p);
                        setRewardsOpen(true);
                      }}
                      className="press inline-flex items-center gap-1.5 rounded-full border border-forest/10 bg-card px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:border-input"
                    >
                      <Settings2 className="h-3.5 w-3.5" aria-hidden /> Manage rewards
                    </button>
                  </div>
                  {p.rewards.length === 0 ? (
                    <p className="mt-2 text-[13px] text-body">
                      No rewards yet — customers can earn but can't redeem until you add one.
                    </p>
                  ) : (
                    <ul className="mt-2.5 space-y-1.5">
                      {p.rewards.map((r) => (
                        <li key={r.id} className="flex items-center gap-2.5 text-sm">
                          <Gift className="h-3.5 w-3.5 shrink-0 text-sienna" strokeWidth={1.75} aria-hidden />
                          <span className="min-w-0 flex-1 truncate font-medium text-ink">
                            {r.title}
                            {!r.active && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}
                          </span>
                          <span className="rounded-full bg-lime-soft px-2 py-0.5 text-xs font-bold text-forest tabular-nums">
                            {r.cost} {r.unit === "POINTS" ? "pts" : "stamps"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </MerchantCard>
            </Reveal>
          ))}
        </div>
      )}

      <ProgramEditorDialog
        open={editorOpen}
        businessId={business.id}
        program={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={async (msg) => {
          setEditorOpen(false);
          await reload();
          setBanner({ kind: "ok", text: msg });
        }}
      />

      <RewardsDialog
        open={rewardsOpen}
        program={rewardsFor}
        onClose={() => setRewardsOpen(false)}
        onChanged={reload}
      />
    </div>
  );
}

/* ─────────────────────────── Editor dialog ────────────────────────── */

function ProgramEditorDialog({
  open,
  businessId,
  program,
  onClose,
  onSaved,
}: {
  open: boolean;
  businessId: string;
  program: ProgramRowT | null;
  onClose: () => void;
  onSaved: (msg: string) => void | Promise<void>;
}) {
  const isEdit = program !== null;
  const [name, setName] = useState("");
  const [type, setType] = useState<ProgramType>("STAMPS");
  const [terms, setTerms] = useState("");
  const [config, setConfig] = useState<ConfigDraft>(EMPTY_CONFIG);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed the form each time the dialog opens.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = `${open}-${program?.id ?? "new"}`;
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey);
    if (program) {
      setName(program.name);
      setType(program.type as ProgramType);
      setTerms(program.terms ?? "");
      const c = parseProgramConfig(program.config);
      setConfig({
        ...EMPTY_CONFIG,
        stampsToReward: String(c.stampsToReward ?? 5),
        pointsPerRupeePaise: String(c.pointsPerRupeePaise ?? 5),
        servicesToReward: String(c.servicesToReward ?? 4),
        starsPerVisit: String(c.starsPerVisit ?? 1),
        starsToReward: String(c.starsToReward ?? 10),
      });
    } else {
      setName("");
      setType("STAMPS");
      setTerms("");
      setConfig(EMPTY_CONFIG);
    }
    setErr(null);
  }

  const typeMeta = useMemo(() => TYPE_OPTIONS.find((t) => t.value === type)!, [type]);

  const save = async () => {
    setErr(null);
    if (name.trim().length < 2) {
      setErr("Program name must be at least 2 characters.");
      return;
    }
    const built = buildConfig(type, config);
    if (typeof built === "string") {
      setErr(built);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api("/api/merchant/program", {
          method: "PUT",
          body: JSON.stringify({ id: program.id, name: name.trim(), type, config: built, terms: terms.trim() || null }),
        });
        await onSaved("Program updated.");
      } else {
        await api("/api/merchant/program", {
          method: "POST",
          body: JSON.stringify({
            businessId,
            name: name.trim(),
            type,
            config: built,
            terms: terms.trim() || null,
            status: "DRAFT",
          }),
        });
        await onSaved("Program saved as draft — activate it when you're ready.");
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't save the program.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-[24px] sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">
            {isEdit ? "Edit program" : "New loyalty program"}
          </DialogTitle>
          <DialogDescription className="text-sm text-body">
            Customers earn per visit or per spend. Only one program per type can be active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <FieldLabel htmlFor="prog-name">Program name</FieldLabel>
            <Input
              id="prog-name"
              className="h-11 rounded-xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coffee punch card"
              maxLength={80}
            />
          </div>

          {!isEdit && (
            <div>
              <FieldLabel>How customers earn</FieldLabel>
              <div className="grid gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                    className={`press flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      type === t.value
                        ? "border-forest bg-lime-soft/60"
                        : "border-forest/10 bg-card hover:border-input"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${
                        type === t.value ? "border-forest bg-forest" : "border-forest/30"
                      }`}
                    >
                      {type === t.value && <Check className="h-3 w-3 text-lime" strokeWidth={3} aria-hidden />}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink">{t.label}</span>
                      <span className="block text-[13px] leading-5 text-body">{t.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Config per type */}
          {type === "STAMPS" && (
            <div>
              <FieldLabel htmlFor="cfg-stamps">Visits for a free reward</FieldLabel>
              <Input
                id="cfg-stamps"
                type="number"
                min={2}
                max={50}
                className="h-11 rounded-xl tabular-nums"
                value={config.stampsToReward}
                onChange={(e) => setConfig((c) => ({ ...c, stampsToReward: e.target.value.replace(/\D/g, "") }))}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">One stamp per visit · 2–50.</p>
            </div>
          )}
          {type === "POINTS" && (
            <div>
              <FieldLabel htmlFor="cfg-points">Points per ₹100 spent</FieldLabel>
              <Input
                id="cfg-points"
                type="number"
                min={1}
                max={100}
                className="h-11 rounded-xl tabular-nums"
                value={config.pointsPerRupeePaise}
                onChange={(e) => setConfig((c) => ({ ...c, pointsPerRupeePaise: e.target.value.replace(/\D/g, "") }))}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">1–100 · customers earn on scanned amount QRs.</p>
            </div>
          )}

          <div>
            <FieldLabel htmlFor="prog-terms">Terms (shown to customers)</FieldLabel>
            <Textarea
              id="prog-terms"
              className="min-h-20 rounded-xl"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              maxLength={500}
              placeholder="e.g. One stamp per visit, per person. Free coffee on the 5th stamp."
            />
          </div>

          <FormError message={err} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="h-11 rounded-full px-5 font-semibold">
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving}
            className="h-11 rounded-full bg-forest px-6 font-semibold text-primary-foreground hover:bg-forest/90"
          >
            {saving && <Spinner />} {isEdit ? "Save changes" : "Create program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Rewards dialog ────────────────────────── */

function RewardsDialog({
  open,
  program,
  onClose,
  onChanged,
}: {
  open: boolean;
  program: ProgramRowT | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [unit, setUnit] = useState<"POINTS" | "STAMPS">("POINTS");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const seedKey = `${open}-${program?.id ?? "none"}`;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey);
    setTitle("");
    setCost(program?.rewards.some((r) => r.unit === "STAMPS") ? "" : "");
    setUnit(program?.type === "STAMPS" || program?.type === "SERVICE_COUNT" ? "STAMPS" : "POINTS");
    setDescription("");
    setErr(null);
  }

  if (!program) return null;

  const add = async () => {
    setErr(null);
    const costNum = Number.parseInt(cost, 10);
    if (title.trim().length < 2) {
      setErr("Reward title must be at least 2 characters.");
      return;
    }
    if (!Number.isInteger(costNum) || costNum < 1 || costNum > 1000000) {
      setErr("Cost must be a whole number between 1 and 1,000,000.");
      return;
    }
    if (unit === "STAMPS" && program.type === "POINTS") {
      setErr("A points program redeems with points — choose pts as the unit.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/merchant/rewards", {
        method: "POST",
        body: JSON.stringify({
          programId: program.id,
          title: title.trim(),
          cost: costNum,
          unit,
          description: description.trim() || null,
          active: true,
        }),
      });
      setTitle("");
      setCost("");
      setDescription("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't add the reward.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    setErr(null);
    try {
      await api(`/api/merchant/rewards?id=${id}`, { method: "DELETE" });
      await onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't remove the reward.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-[24px] sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">
            Rewards · {program.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-body">
            What customers get when they redeem. Costs are in {unit === "POINTS" ? "points" : "stamps"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Existing rewards */}
          {program.rewards.length > 0 && (
            <ul className="space-y-2">
              {program.rewards.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-forest/8 bg-secondary/40 px-3.5 py-2.5"
                >
                  <Gift className="h-4 w-4 shrink-0 text-sienna" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {r.title}
                      {!r.active && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}
                    </p>
                    {r.description && (
                      <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-lime-soft px-2.5 py-0.5 text-xs font-bold text-forest tabular-nums">
                    {r.cost} {r.unit === "POINTS" ? "pts" : "stamps"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${r.title}`}
                    disabled={deletingId === r.id}
                    onClick={() => void remove(r.id)}
                    className="press flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === r.id ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add form */}
          <div className="space-y-3 rounded-xl border border-forest/10 p-4">
            <Micro>Add a reward</Micro>
            <div>
              <FieldLabel htmlFor="rw-title">Title</FieldLabel>
              <Input
                id="rw-title"
                className="h-11 rounded-xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. Free filter coffee"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="rw-cost">Cost</FieldLabel>
                <Input
                  id="rw-cost"
                  inputMode="numeric"
                  className="h-11 rounded-xl tabular-nums"
                  value={cost}
                  onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
                  placeholder={unit === "POINTS" ? "500" : "5"}
                />
              </div>
              <div>
                <FieldLabel>Unit</FieldLabel>
                <div className="flex rounded-xl bg-secondary p-1">
                  {(["POINTS", "STAMPS"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => setUnit(u)}
                      className={`press h-9 flex-1 rounded-lg text-[13px] font-semibold transition-colors ${
                        unit === u ? "bg-card text-ink shadow-soft" : "text-body"
                      }`}
                    >
                      {u === "POINTS" ? "Points" : "Stamps"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="rw-desc">Description (optional)</FieldLabel>
              <Input
                id="rw-desc"
                className="h-11 rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                placeholder="Any size, any day"
              />
            </div>
            <FormError message={err} />
            <Button
              onClick={() => void add()}
              disabled={busy}
              className="press h-11 w-full rounded-full bg-forest font-semibold text-primary-foreground hover:bg-forest/90"
            >
              {busy ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden />} Add reward
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-full px-5 font-semibold">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
