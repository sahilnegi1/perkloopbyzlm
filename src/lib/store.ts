"use client";

import { create } from "zustand";
import { get, post } from "@/lib/api";

export type Role = "CUSTOMER" | "MERCHANT_OWNER" | "STAFF";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
};

type SessionState = {
  user: SessionUser | null;
  loading: boolean;
  fetched: boolean;
  fetchMe: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
  logout: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  user: null,
  loading: true,
  fetched: false,
  fetchMe: async () => {
    set({ loading: true });
    try {
      const data = await get<{ user: SessionUser | null }>("/api/me");
      set({ user: data.user, loading: false, fetched: true });
    } catch {
      set({ user: null, loading: false, fetched: true });
    }
  },
  setUser: (u) => set({ user: u, loading: false, fetched: true }),
  logout: async () => {
    try {
      await post("/api/auth/logout");
    } finally {
      set({ user: null, loading: false, fetched: true });
    }
  },
}));
