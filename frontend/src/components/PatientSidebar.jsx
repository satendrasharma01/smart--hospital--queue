import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

function PatientSidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setIsOpen(false);
      navigate("/login", { replace: true });
    }
  };

  const links = [
    { label: "Overview", path: "/patient/dashboard", icon: LayoutDashboard },
    { label: "Find Doctor", path: "/patient/doctors", icon: Search },
    { label: "Appointments", path: "/patient/appointments", icon: CalendarDays },
    { label: "Live Queue", path: "/patient/queue", icon: Activity },
    { label: "Profile", path: "/patient/profile", icon: UserRound },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <NavLink to="/patient/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Activity size={17} />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight text-slate-900">
            Smart Hospital
          </span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open patient menu"
          aria-expanded={isOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100"
        >
          <Menu size={21} />
        </button>
      </header>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Patient navigation menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full bg-slate-950/40"
          />

          <aside className="relative flex h-full w-[min(84vw,320px)] flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <NavLink
                to="/patient/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Activity size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-slate-900">
                    Smart Hospital
                  </p>
                  <p className="text-[11px] text-slate-500">Patient Portal</p>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close patient menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <nav aria-label="Patient mobile navigation" className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {links.map((link) => {
                  const Icon = link.icon;

                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        [
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        ].join(" ")
                      }
                    >
                      <Icon size={19} />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </nav>

            <div className="shrink-0 border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={19} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Activity size={17} />
          </div>
          <span className="font-semibold tracking-tight text-slate-900">
            Smart Hospital
          </span>
        </div>

        <nav aria-label="Patient desktop navigation" className="flex-1 space-y-1 p-4">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")
                }
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default PatientSidebar;
