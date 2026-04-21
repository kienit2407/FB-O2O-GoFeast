/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminAuthService } from "@/service/adminAuth.service";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;

  isLoading: boolean;
  isBootstrapping: boolean;
  _isHydrated: boolean;

  // actions
  setHydrated: (v: boolean) => void;
  setAccessToken: (t: string | null) => void;
  clear: () => void;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  fetchMe: () => Promise<AdminUser | null>;
  bootstrap: () => Promise<void>;
}

// Helper functions
export const isSuperAdmin = (user: AdminUser | null): boolean =>
  user?.role === 'admin';

export const isOpsAdmin = (user: AdminUser | null): boolean =>
  user?.role === 'admin';

export const isFinanceAdmin = (user: AdminUser | null): boolean =>
  user?.role === 'admin';

// Single-flight promises
let bootstrapPromise: Promise<void> | null = null;
let fetchMePromise: Promise<AdminUser | null> | null = null;

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      isLoading: false,
      isBootstrapping: false,
      _isHydrated: false,

      setHydrated: (v) => set({ _isHydrated: v }),
      setAccessToken: (t) => set({ accessToken: t }),

      clear: () =>
        set({
          user: null,
          accessToken: null,
          isLoading: false,
          isBootstrapping: false,
        }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await adminAuthService.login({ email, password });
          const data = res.data?.data;
          console.log('[AuthStore] Login response:', { hasToken: !!data?.access_token, hasUser: !!data?.user });

          set({
            accessToken: data?.access_token ?? null,
            user: data?.user ?? null,
          });
          console.log('[AuthStore] After login - accessToken:', !!get().accessToken);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        bootstrapPromise = null;
        fetchMePromise = null;

        try {
          await adminAuthService.logout();
        } finally {
          get().clear();
        }
      },

      fetchMe: async () => {
        if (fetchMePromise) return fetchMePromise;

        fetchMePromise = (async () => {
          const res = await adminAuthService.me();
          const me = (res.data?.data ?? null) as AdminUser | null;
          set({ user: me });
          return me;
        })();

        try {
          return await fetchMePromise;
        } finally {
          fetchMePromise = null;
        }
      },

      bootstrap: async () => {
        if (bootstrapPromise) return bootstrapPromise;

        bootstrapPromise = (async () => {
          set({ isBootstrapping: true });

          try {
            // Nếu chưa có accessToken => thử refresh từ cookie
            if (!get().accessToken) {
              try {
                const r = await adminAuthService.refresh();
                const token = r.data?.data?.access_token;
                if (token) set({ accessToken: token });
                else {
                  get().clear();
                  return;
                }
              } catch {
                get().clear();
                return;
              }
            }

            // Có token rồi => fetchMe
            if (get().accessToken) {
              try {
                await get().fetchMe();
              } catch {
                // nếu /me fail (401) thì clear để về login
                get().clear();
              }
            }
          } finally {
            set({ isBootstrapping: false });
            bootstrapPromise = null;
          }
        })();

        return bootstrapPromise;
      },
    }),
    {
      name: "admin-auth",
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),

      // quan trọng: setHydrated bằng action (KHÔNG mutate state trực tiếp)
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("[AuthStore] Hydration error:", error);
        state?.setHydrated(true);
        console.log("[AuthStore] Hydrated:", {
          hasToken: !!state?.accessToken,
          hasUser: !!state?.user,
        });
      },
    }
  )
);

// debug global
if (typeof window !== "undefined") (window as any).__adminAuth = useAdminAuth;
