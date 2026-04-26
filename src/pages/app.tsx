import AppLayout from "../components/layout/AppLayout";
import AuthGuard from "../components/AuthGuard";

export default function AppRoot() {
  return (
    <AuthGuard>
      <AppLayout />
    </AuthGuard>
  );
}
