import { AuthGuard } from "../components/AuthGuard";
import { AdminPage } from "../components/AdminPage";

export const metadata = {
  title: "Admin · Circuito Nacional Jurídico Agro 2026",
};

export default function Admin() {
  return (
    <AuthGuard requireAdmin>
      <AdminPage />
    </AuthGuard>
  );
}
