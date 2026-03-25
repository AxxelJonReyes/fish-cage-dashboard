import { createClient } from "@/lib/supabase/server";
import NavbarClient from "./NavbarClient";

async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role ?? null;
}

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserRole(user.id) : null;

  return <NavbarClient isLoggedIn={!!user} role={role} />;
}

