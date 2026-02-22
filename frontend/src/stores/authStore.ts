import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  userId: string;
  email: string;
  role: "patient" | "clinician";
}

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: "patient" | "clinician") => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (token: string, user: UserProfile) => void;
}

async function resolveProfile(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      userId: json.data.user_id,
      email: json.data.email,
      role: json.data.role,
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            const token = data.session.access_token;
            const profile = await resolveProfile(token);
            if (profile) {
              set({
                accessToken: token,
                user: profile,
                isAuthenticated: true,
              });
            }
          }
        } finally {
          set({ isLoading: false });
        }

        supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            if (!session) {
              set({
                accessToken: null,
                user: null,
                isAuthenticated: false,
              });
              return;
            }

            if (
              event === "SIGNED_IN" ||
              event === "TOKEN_REFRESHED" ||
              event === "INITIAL_SESSION"
            ) {
              const token = session.access_token;
              const currentToken = get().accessToken;
              if (token !== currentToken) {
                const profile = await resolveProfile(token);
                if (profile) {
                  set({
                    accessToken: token,
                    user: profile,
                    isAuthenticated: true,
                  });
                }
              }
            }

            if (event === "SIGNED_OUT") {
              set({
                accessToken: null,
                user: null,
                isAuthenticated: false,
              });
            }
          },
        );
      },

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await get().initialize();
      },

      signUp: async (email, password, role = "patient") => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role } },
        });
        if (error) throw error;
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      setSession: (token, user) => {
        set({ accessToken: token, user, isAuthenticated: true });
      },
    }),
    {
      name: "pharmasense-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
