import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DoctorSidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Doctor logout error:", error);
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  const links = [
    {
      label: "Dashboard",
      path: "/doctor/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Queue",
      path: "/doctor/queue",
      icon: ClipboardList,
    },
    {
      label: "Patients",
      path: "/doctor/patients",
      icon: Users,
    },
    {
      label: "Availability",
      path: "/doctor/availability",
      icon: CalendarDays,
    },
    {
      label: "Profile",
      path: "/doctor/profile",
      icon: UserRound,
    },
    {
      label: "MFA",
      path: "/mfa-settings",
      icon: ShieldCheck,
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => navigate("/doctor/dashboard")}
          className="text-left"
        >
          <p className="text-sm font-bold tracking-tight text-slate-900">
            Smart Hospital
          </p>
          <p className="text-[11px] text-slate-500">Doctor Portal</p>
        </button>
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
        aria-label="Doctor navigation"
        className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden"
      >
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                [
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")
              }
            >
              <Icon size={15} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-full min-h-screen flex-col">
        {/* Logo */}
        <div className="border-b border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={() =>
              navigate("/doctor/dashboard")
            }
            className="text-left"
          >
            <p className="text-lg font-bold tracking-tight text-slate-900">
              Smart Hospital
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              Doctor Portal
            </p>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-5">
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
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")
                }
              >
                <Icon size={18} />

                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />

            <span>Logout</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

export default DoctorSidebar;