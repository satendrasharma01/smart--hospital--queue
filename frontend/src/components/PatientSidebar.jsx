import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Search,
  UserRound,
  Activity,
} from "lucide-react";

function PatientSidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = [
    {
      label: "Overview",
      path: "/patient/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Find Doctor",
      path: "/patient/doctors",
      icon: Search,
    },
    {
      label: "Appointments",
      path: "/patient/appointments",
      icon: CalendarDays,
    },
    {
      label: "Live Queue",
      path: "/patient/queue",
      icon: Activity,
    },
    {
      label: "Profile",
      path: "/patient/profile",
      icon: UserRound,
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <NavLink to="/patient/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Activity size={17} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Smart Hospital
          </span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={18} />
        </button>
      </div>
      <nav
        aria-label="Patient navigation"
        className="flex gap-1 w-full max-w-full overflow-x-auto border-b border-slate-200 bg-white w-full max-w-full px-2 py-2 lg:hidden"
      >
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon size={15} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Activity size={17} />
        </div>

        <span className="font-semibold tracking-tight text-slate-900">
          Smart Hospital
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon size={18} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}

export default PatientSidebar;