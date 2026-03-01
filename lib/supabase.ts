import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type ToyCategory = "已量产" | "设计稿" | "同人创作";

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
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseConfigError() {
  if (!supabaseUrl) {
    return "缺少 NEXT_PUBLIC_SUPABASE_URL，请检查 .env.local 配置。";
  }

  if (!isValidSupabaseUrl(supabaseUrl)) {
    return "NEXT_PUBLIC_SUPABASE_URL 格式不正确，请填写完整的 http(s) URL。";
  }

  if (!supabaseAnonKey) {
    return "缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY，请检查 .env.local 配置。";
  }

  return null;
}

function assertSupabaseEnv() {
  const configError = getSupabaseConfigError();
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
