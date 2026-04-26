import { Navigate } from "react-router";

export default function Home() {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/app/planning" replace />;
  }

  return <Navigate to="/login" replace />;
}
