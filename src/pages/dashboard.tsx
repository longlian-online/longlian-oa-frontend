import { Link } from "react-router";

export default function Dashboard() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Link to="/" className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
        ← Home
      </Link>
    </div>
  );
}
