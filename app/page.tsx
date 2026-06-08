import { AuthGuard } from "./components/AuthGuard";
import { Dashboard } from "./components/Dashboard";
import { supabase } from "../lib/supabase";
import type { AppEvent } from "./types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  const events = (data ?? []) as AppEvent[];

  return (
    <AuthGuard>
      <Dashboard events={events} />
    </AuthGuard>
  );
}
