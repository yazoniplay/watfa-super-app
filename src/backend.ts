import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// These are public client values; RLS must protect every table. Environment variables override them.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vlquvrqrvbscpeihyfsu.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_OjWA4Hfv4N5dKb9bBbzByA_Zeudgc58";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export type HaircutHistoryRow = {
  id: string;
  style_name: string;
  notes: string | null;
  created_at: string;
};

export type BarberRow = {
  user_id: string;
  shop_name: string;
  bio: string | null;
  city: string | null;
};

export type ServiceRow = {
  id: string;
  barber_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor: number;
  currency: string;
};

export type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  services?: { name: string; price_minor: number; currency: string } | null;
  barber_profiles?: { shop_name: string; city: string | null } | null;
};

export function getConfiguredEndpoint(name: "AI_PREVIEW" | "AI_RECOMMEND" | "CHECKOUT") {
  const endpoints: Record<typeof name, string | undefined> = {
    AI_PREVIEW: process.env.EXPO_PUBLIC_AI_PREVIEW_URL,
    AI_RECOMMEND: process.env.EXPO_PUBLIC_AI_RECOMMEND_URL,
    CHECKOUT: process.env.EXPO_PUBLIC_CHECKOUT_URL,
  };
  return endpoints[name] || null;
}
