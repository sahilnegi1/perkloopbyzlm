"use client";

/**
 * Merchant business registration step (post-OTP, register-as-merchant flow).
 * POST /api/merchant/business — fields match businessCreateSchema in src/lib/validation.
 */

import { useState } from "react";
import { post } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABELS, Spinner, type Category } from "@/components/customer/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SessionUser } from "@/lib/store";

export type BusinessFormT = {
  name: string;
  category: Category | "";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  description: string;
};

export const EMPTY_BUSINESS_FORM: BusinessFormT = {
  name: "",
  category: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  description: "",
};

function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 normal-case tracking-normal">({hint})</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BusinessRegisterForm({
  onSuccess,
}: {
  onSuccess: (user: SessionUser) => void;
}) {
  const [form, setForm] = useState<BusinessFormT>(EMPTY_BUSINESS_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof BusinessFormT, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof BusinessFormT, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof BusinessFormT, string>> = {};
    if (form.name.trim().length < 2) errs.name = "Business name must be at least 2 characters.";
    if (!form.category) errs.category = "Choose a category.";
    if (form.pincode && !/^[1-9]\d{5}$/.test(form.pincode.trim()))
      errs.pincode = "Enter a valid 6-digit Indian pincode.";
    const phone = form.phone.trim();
    if (phone && !/^[6-9]\d{9}$/.test(phone.replace(/[\s()\-]/g, "").replace(/^(\+91|91|0)/, "")))
      errs.phone = "Enter a valid 10-digit Indian mobile number.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    setApiError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await post<{ business: { id: string }; user: SessionUser }>(
        "/api/merchant/business",
        {
          name: form.name.trim(),
          category: form.category,
          addressLine: form.addressLine.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          pincode: form.pincode.trim() || undefined,
          phone: form.phone.trim() || undefined,
          description: form.description.trim() || undefined,
        }
      );
      onSuccess(res.user);
    } catch (e) {
      setApiError(
        e instanceof ApiError ? e.message : "Couldn't register the business. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Register your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One last step — tell us about your shop so customers can find and collect from you.
        </p>
      </div>

      <Field label="Business name" htmlFor="biz-name" error={fieldErrors.name}>
        <Input
          id="biz-name"
          className="h-11 rounded-xl"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Brew & Bites Café"
          autoComplete="organization"
        />
      </Field>

      <Field label="Category" htmlFor="biz-category" error={fieldErrors.category}>
        <Select value={form.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger id="biz-category" className="h-11 w-full rounded-xl">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Address" htmlFor="biz-address" error={fieldErrors.addressLine} hint="optional">
        <Input
          id="biz-address"
          className="h-11 rounded-xl"
          value={form.addressLine}
          onChange={(e) => set("addressLine", e.target.value)}
          placeholder="Shop 4, MG Road"
          autoComplete="street-address"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City" htmlFor="biz-city" error={fieldErrors.city} hint="optional">
          <Input
            id="biz-city"
            className="h-11 rounded-xl"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Noida"
          />
        </Field>
        <Field label="State" htmlFor="biz-state" error={fieldErrors.state} hint="optional">
          <Input
            id="biz-state"
            className="h-11 rounded-xl"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            placeholder="Uttar Pradesh"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pincode" htmlFor="biz-pincode" error={fieldErrors.pincode} hint="optional">
          <Input
            id="biz-pincode"
            className="h-11 rounded-xl tabular-nums"
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
            placeholder="201301"
          />
        </Field>
        <Field label="Phone" htmlFor="biz-phone" error={fieldErrors.phone} hint="optional">
          <Input
            id="biz-phone"
            className="h-11 rounded-xl tabular-nums"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="98765 43210"
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="biz-desc" error={fieldErrors.description} hint="optional">
        <Textarea
          id="biz-desc"
          className="min-h-20 rounded-xl"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What do you sell? What makes the place special?"
        />
      </Field>

      {apiError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive" role="alert">
          {apiError}
        </p>
      )}

      <Button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="press h-12 w-full rounded-full text-base font-semibold"
      >
        {submitting && <Spinner />}
        Create my business
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You can add loyalty programs, rewards and outlets from the merchant dashboard next.
      </p>
    </div>
  );
}
