import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, CalendarDays, LayoutDashboard, LogOut, Menu, Search, UserRound, X } from "lucide-react";

function PatientSidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Overview", path: "/patient/dashboard", icon: LayoutDashboard },
    { label: "Find Doctor", path: "/patient/doctors", icon: Search },
    { label: "Appointments", path: "/patient/appointments", icon: CalendarDays },
    { label: "Live Queue", path: "/patient/queue", icon: Activity },
    { label: "Profile", path: "/patient/profile", icon: UserRound },
  ];

  const handleLogout = async () => {
    try { await logout(); } catch (error) { console.error("Patient logout error:", error); }
    finally { navigate("/login", { replace: true }); }
  };
  const close = () => setOpen(false);

  const navigation = (mobile=false) => (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Patient navigation">
      {links.map(({ label, path, icon: Icon }) => (
        <NavLink key={path} to={path} onClick={mobile ? close : undefined} className={({ isActive }) => [
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
          isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        ].join(" ")}>
          <Icon size={18} /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open patient navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"><Menu size={21} /></button>
        <button type="button" onClick={() => navigate("/patient/dashboard")} className="flex items-center gap-2 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Activity size={17} /></span>
          <span><span className="block text-sm font-semibold tracking-tight text-slate-900">Smart Hospital</span><span className="block text-[11px] text-slate-500">Patient Portal</span></span>
        </button>
        <button type="button" onClick={handleLogout} aria-label="Log out" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"><LogOut size={18} /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Patient navigation">
          <button type="button" aria-label="Close patient navigation" onClick={close} className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Activity size={17} /></span><div><p className="text-sm font-semibold text-slate-900">Smart Hospital</p><p className="text-[11px] text-slate-500">Patient Portal</p></div></div>
              <button type="button" onClick={close} aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
            </div>
            {navigation(true)}
            <div className="shrink-0 border-t border-slate-200 p-3">
              <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2"><p className="truncate text-xs font-medium text-slate-800">{user?.name || "Patient"}</p><p className="text-[11px] text-slate-500">Patient</p></div>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"><LogOut size={18} />Logout</button>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Activity size={17} /></span><div><p className="text-sm font-semibold text-slate-900">Smart Hospital</p><p className="text-[11px] text-slate-500">Patient Portal</p></div></div>
        {navigation(false)}
        <div className="shrink-0 border-t border-slate-200 p-3"><div className="mb-2 px-3"><p className="truncate text-xs font-medium text-slate-800">{user?.name || "Patient"}</p><p className="text-[11px] text-slate-500">Patient</p></div><button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"><LogOut size={18} />Logout</button></div>
      </aside>
    </>
  );
}

export default PatientSidebar;
