import { AuthGuard } from "../components/AuthGuard";
import { AnalysisPage } from "../components/AnalysisPage";
import utmData from "../../data/utm.json";

export const metadata = {
  title: "Análise UTM · Circuito Nacional Jurídico Agro 2026",
};

export default function AnalisePage() {
  return (
    <AuthGuard>
      <AnalysisPage
        campaigns={utmData.campaigns}
        attribution={utmData.attribution}
        quickFilters={utmData.quickFilters}
      />
    </AuthGuard>
  );
}
