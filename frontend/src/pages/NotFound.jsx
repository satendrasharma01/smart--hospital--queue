import { Link } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Activity size={22} />
        </div>
        <p className="mt-6 text-sm font-medium text-slate-500">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">The page you requested does not exist or may have moved.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </main>
  );
}

export default NotFound;
