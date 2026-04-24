import { Link } from "react-router";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Home</h1>
      <div className="flex gap-2">
        <Link to="/about" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          About
        </Link>
        <Link
          to="/dashboard"
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Dashboard
        </Link>
        <Link to="/settings" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          Settings
        </Link>
      </div>
    </div>
  );
}
