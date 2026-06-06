import { AuthGuard } from "./components/AuthGuard";
import { Dashboard } from "./components/Dashboard";
import type { AppEvent } from "./types";
import eventsData from "../data/events.json";

export default function Home() {
  return (
    <AuthGuard>
      <Dashboard
        events={eventsData.events as AppEvent[]}
        financials={eventsData.financials}
      />
    </AuthGuard>
  );
}
