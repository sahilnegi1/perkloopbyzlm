"use client";

/**
 * Settings (#/merchant/settings) — business profile (PUT /api/merchant/business),
 * outlets (POST /api/merchant/outlets), honest third-party-free state.
 * Manual address by design (no Maps keys) — labeled as such.
 */

import { useState } from "react";
import { Check, MapPin, Plus, Store } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal, Spinner } from "@/components/customer/shared";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
} from "@/components/customer/shared";
import {
  MerchantHeader,
  ErrorBlock,
  FieldLabel,
  FormError,
  MerchantCard,
  Micro,
  type BusinessT,
} from "./shared";

export function SettingsScreen({ business }: { business: BusinessT }) {
  return (
    <div>
      <MerchantHeader eyebrow="Configuration" title="Settings" />
      <div className="space-y-5">
        <BusinessProfileForm business={business} />
        <OutletsCard business={business} />
      </div>
    </div>
  );
}

/* ─────────────────────────── Business profile ─────────────────────── */

function BusinessProfileForm({ business }: { business: BusinessT }) {
  const [name, setName] = useState(business.name);
  const [category, setCategory] = useState(business.category as Category);
  const [description, setDescription] = useState(business.description ?? "");
  const [addressLine, setAddressLine] = useState(business.addressLine ?? "");
  const [city, setCity] = useState(business.city ?? "");
  const [state, setState] = useState(business.state ?? "");
  const [pincode, setPincode] = useState(business.pincode ?? "");
  const [phone, setPhone] = useState(business.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setSaved(false);
    if (name.trim().length < 2) {
      setErr("Business name must be at least 2 characters.");
      return;
    }
    if (pincode && !/^[1-9]\d{5}$/.test(pincode.trim())) {
      setErr("Enter a valid 6-digit Indian pincode.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/merchant/business", {
        method: "PUT",
        // The update schema requires the business id (audit F04 — saving used
        // to 400 with "id: Invalid input"); ownership is still server-checked.
        body: JSON.stringify({
          id: business.id,
          name: name.trim(),
          category,
          description: description.trim() || null,
          addressLine: addressLine.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Reveal>
      <MerchantCard>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft">
            <Store className="h-5 w-5 text-forest" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Business profile</h2>
            <Micro>Shown to customers on discovery</Micro>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="set-name">Business name</FieldLabel>
            <Input id="set-name" className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="set-addr">Address</FieldLabel>
            <Input
              id="set-addr"
              className="h-11 rounded-xl"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="Shop 4, Sector 18 Market"
              maxLength={200}
            />
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden /> Manual entry for now — map pin arrives with our maps integration.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="set-city">City</FieldLabel>
              <Input id="set-city" className="h-11 rounded-xl" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
            </div>
            <div>
              <FieldLabel htmlFor="set-state">State</FieldLabel>
              <Input id="set-state" className="h-11 rounded-xl" value={state} onChange={(e) => setState(e.target.value)} maxLength={80} />
            </div>
            <div>
              <FieldLabel htmlFor="set-pin">Pincode</FieldLabel>
              <Input
                id="set-pin"
                className="h-11 rounded-xl tabular-nums"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="set-phone">Shop phone</FieldLabel>
            <Input
              id="set-phone"
              className="h-11 rounded-xl tabular-nums"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="set-desc">Description</FieldLabel>
            <Textarea
              id="set-desc"
              className="min-h-20 rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What do you sell? What makes the place special?"
            />
          </div>
        </div>

        <FormError message={err} />

        <div className="mt-5 flex items-center gap-3">
          <Button
            onClick={() => void save()}
            disabled={saving}
            className="press h-11 rounded-full bg-forest px-6 font-semibold text-primary-foreground hover:bg-forest/90"
          >
            {saving ? <Spinner /> : saved ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </MerchantCard>
    </Reveal>
  );
}

/* ─────────────────────────── Outlets ──────────────────────────────── */

function OutletsCard({ business }: { business: BusinessT }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [outlets, setOutlets] = useState(business.outlets);

  const add = async () => {
    setErr(null);
    if (name.trim().length < 2) {
      setErr("Outlet name must be at least 2 characters.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/merchant/outlets", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), addressLine: address.trim() || undefined }),
      });
      const res = await api<{ business: BusinessT }>("/api/merchant/business");
      setOutlets(res.business?.outlets ?? business.outlets);
      setName("");
      setAddress("");
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't add the outlet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal delay={0.06}>
      <MerchantCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Outlets</h2>
            <Micro>Each outlet gets its own check-in QR</Micro>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{outlets.length}</span>
        </div>

        <ul className="divide-y divide-forest/6">
          {outlets.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft">
                <MapPin className="h-4 w-4 text-forest" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {o.name}
                  {o.isPrimary && (
                    <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Primary
                    </span>
                  )}
                </p>
                {o.addressLine && <Micro className="mt-0.5">{o.addressLine}</Micro>}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 border-t border-forest/6 pt-4 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <FieldLabel htmlFor="out-name">New outlet name</FieldLabel>
            <Input
              id="out-name"
              className="h-11 rounded-xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sector 62 kiosk"
              maxLength={100}
            />
          </div>
          <div>
            <FieldLabel htmlFor="out-addr">Address (optional)</FieldLabel>
            <Input
              id="out-addr"
              className="h-11 rounded-xl"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => void add()}
              disabled={busy}
              className="press h-11 w-full rounded-full bg-forest px-5 font-semibold text-primary-foreground hover:bg-forest/90 sm:w-auto"
            >
              {busy ? <Spinner /> : added ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {added ? "Added" : "Add outlet"}
            </Button>
          </div>
        </div>
        <FormError message={err} />
      </MerchantCard>
    </Reveal>
  );
}
