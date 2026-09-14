import { Link } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";

function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Activity size={19} />
          </div>

          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Smart Hospital
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#how-it-works" className="transition hover:text-slate-900">
            How it works
          </a>

          <a href="#features" className="transition hover:text-slate-900">
            Features
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:block"
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Get started
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;