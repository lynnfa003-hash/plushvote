import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { CategoryValue } from "@/lib/i18n";

export type ToyCategory = CategoryValue;

export type Database = {
  public: {
    Tables: {
      plush_toys: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string;
          category: ToyCategory;
          vote_count: number;
          is_approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url: string;
          category?: ToyCategory;
          vote_count?: number;
          is_approved?: boolean;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          toy_id: string | null;
          voter_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          toy_id?: string | null;
          voter_id: string;
          created_at?: string;
        };
      };
      email_subscriptions: {
        Row: {
          id: string;
          email: string;
          locale: "en" | "zh";
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          locale?: "en" | "zh";
          created_at?: string;
        };
      };
      plush_toy_images: {
        Row: {
          id: string;
          toy_id: string;
          image_url: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          toy_id: string;
          image_url: string;
          display_order?: number;
          created_at?: string;
        };
      };
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey);
export const isSupabaseAdminConfigured = isSupabaseConfigured && Boolean(supabaseServiceRoleKey);

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseConfigError() {
  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.";
  }

  if (!isValidSupabaseUrl(supabaseUrl)) {
    return "NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL.";
  }

  if (!supabaseAnonKey) {
    return "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.";
  }

  return null;
}

export function getSupabaseAdminConfigError() {
  const baseError = getSupabaseConfigError();
  if (baseError) {
    return baseError;
  }

  if (!supabaseServiceRoleKey) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.";
  }

  return null;
}

function assertSupabaseEnv() {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }
}

function assertSupabaseAdminEnv() {
  const configError = getSupabaseAdminConfigError();
  if (configError) {
    throw new Error(configError);
  }
}

export function createServerSupabaseClient() {
  assertSupabaseEnv();
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createBrowserSupabaseClient() {
  assertSupabaseEnv();
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl!, supabaseAnonKey!);
  }
  return browserClient;
}

export function createServiceRoleSupabaseClient() {
  assertSupabaseAdminEnv();
  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
