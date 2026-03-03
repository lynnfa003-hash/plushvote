import HomePageClient from "@/components/HomePageClient";
import { reportError } from "@/lib/monitoring";
import {
  createServerSupabaseClient,
  getSupabaseConfigError,
  isSupabaseConfigured,
  type Database,
  type ToyCategory
} from "@/lib/supabase";

type ToyRow = Pick<
  Database["public"]["Tables"]["plush_toys"]["Row"],
  "id" | "name" | "description" | "image_url" | "category" | "vote_count"
>;

export const revalidate = 60;

async function fetchApprovedToys(): Promise<ToyRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("plush_toys")
    .select("id, name, description, image_url, category, vote_count")
    .eq("is_approved", true)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    await reportError(error, {
      where: "app/page.tsx",
      action: "fetchApprovedToys"
    });
    return [];
  }

  return data ?? [];
}

export default async function HomePage() {
  const toys = await fetchApprovedToys();

  return (
    <HomePageClient
      toys={toys.map((toy) => ({
        ...toy,
        category: toy.category as ToyCategory
      }))}
      isSupabaseReady={isSupabaseConfigured}
      supabaseConfigError={getSupabaseConfigError()}
    />
  );
}
