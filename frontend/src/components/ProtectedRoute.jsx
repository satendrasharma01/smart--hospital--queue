import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Checking your session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rolesToCheck = allowedRoles ?? (role ? [role] : []);

  if (rolesToCheck.length > 0 && !rolesToCheck.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;