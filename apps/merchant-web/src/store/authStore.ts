/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';
import { merchantAuthService } from '@/service/merchant.auth.service';
import { Merchant } from '@/types/merchant.types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import NProgress from 'nprogress';
type MerchantApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';
type OnboardingStep = 'basic_info' | 'documents' | 'ready_to_submit' | 'waiting_approval' | 'approved' | 'rejected';

export interface OnboardingStatus {
  has_onboarding: boolean;
  current_step: OnboardingStep;
  step_number: number;
  merchant_approval_status: MerchantApprovalStatus;
  rejection_reason?: string | null;
  rejection_reasons?: string[];
  rejection_note?: string | null;
  basic_info?: any;
  documents?: any;
}

interface MerchantAuthState {
  user: any | null;
  accessToken: string | null;
  onboarding: OnboardingStatus | null;
  merchant: Merchant | null;
  isLoading: boolean;
  isBootstrapping: boolean;

  // helpers
  isAuthenticated: () => boolean;
  isApproved: () => boolean;
  isPending: () => boolean;

  setAccessToken: (t: string | null) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;

  fetchMe: () => Promise<void>;
  bootstrap: () => Promise<void>;

  fetchOnboarding: () => Promise<OnboardingStatus>;
  clear: () => void;
}

// Single-flight promise cho bootstrap
let bootstrapPromise: Promise<void> | null = null;

export const useMerchantAuth = create<MerchantAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      merchant: null,
      accessToken: null,
      onboarding: null,
      isLoading: false,
      isBootstrapping: true,

      isAuthenticated: () => !!get().accessToken,
      isApproved: () => get().onboarding?.merchant_approval_status === 'approved',
      isPending: () =>
        get().onboarding?.merchant_approval_status === 'pending_approval' ||
        get().onboarding?.current_step === 'waiting_approval',

      setAccessToken: (t) => set({ accessToken: t }),

      clear: () => set({ user: null, accessToken: null, merchant: null, onboarding: null, isLoading: false }),

      register: async (payload) => {
        set({ isLoading: true });
        NProgress.start()
        try {
          // Clear persist trước để tránh dữ liệu cũ
          useMerchantAuth.persist.clearStorage();
          localStorage.removeItem('merchant-auth');

          const res = await merchantAuthService.register(payload);
          const data = res.data?.data;
          set({
            accessToken: data?.access_token ?? null,
            user: data?.user ?? null,
            onboarding: data?.onboarding ?? null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        NProgress.start()
        try {
          // Clear persist trước để tránh dữ liệu cũ
          useMerchantAuth.persist.clearStorage();
          localStorage.removeItem('merchant-auth');

          const res = await merchantAuthService.login({ email, password });
          const data = res.data?.data;
          set({
            accessToken: data?.access_token ?? null,
            user: data?.user ?? null,
            onboarding: data?.onboarding ?? null,
          });
        } finally {
          set({ isLoading: false });

        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await merchantAuthService.logout(); // có thể fail cũng k sao
        } catch (e) {
          console.warn('logout api failed (ignore):', e);
        } finally {
          bootstrapPromise = null;
          if (typeof window !== 'undefined') {
            (window as any).__fetchMePromise = null;
          }

          set({ user: null, accessToken: null, merchant: null, onboarding: null, isLoading: false });

          useMerchantAuth.persist.clearStorage();
          localStorage.removeItem('merchant-auth');
        }
      },
      fetchMe: async () => {
        // Single-flight: chỉ 1 request cùng lúc
        if ((window as any).__fetchMePromise) {
          return (window as any).__fetchMePromise;
        }

        const promise = merchantAuthService.me()
          .then((res) => {
            const me = res.data?.data;
            set({
              user: me ?? null,
              merchant: me?.merchant ?? null,
              onboarding: me?.onboarding ?? get().onboarding ?? null,
            });
          })
          .finally(() => {
            (window as any).__fetchMePromise = null;
          });

        (window as any).__fetchMePromise = promise;
        return promise;
      },

      bootstrap: async () => {
        if (bootstrapPromise) return bootstrapPromise;

        bootstrapPromise = (async () => {
          set({ isBootstrapping: true });
          try {
            // luôn thử fetchMe
            // - có accessToken: gọi me, 401 thì interceptor tự refresh
            // - không có accessToken: gọi me -> 401 -> interceptor refresh bằng cookie -> retry me
            await get().fetchMe();
          } catch (e) {
            console.warn("Bootstrap failed:", e);
            get().clear();
          } finally {
            bootstrapPromise = null;
            set({ isBootstrapping: false });
          }
        })();

        return bootstrapPromise;
      },

      fetchOnboarding: async () => {
        const res = await merchantAuthService.onboardingStatus();
        const ob = res.data?.data as OnboardingStatus;
        set({ onboarding: ob });
        return ob;
      },
    }),
    {
      name: 'merchant-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        onboarding: s.onboarding,
      }),
    }
  )
);