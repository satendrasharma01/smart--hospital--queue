import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Legacy page guards still consume this value; authentication itself uses the HttpOnly cookie.
  const token = user ? "session-cookie" : null;

  /*
   * =====================================================
   * LOGIN
   * =====================================================
   */

  const login = (userData) => {
    if (!userData) {
      return;
    }

    setUser(userData);

    /*
     * Notify other parts of the application that
     * authentication has changed.
     */
    window.dispatchEvent(
      new CustomEvent("authChanged", {
        detail: {
          user: userData,
        },
      })
    );
  };

  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const logout = () => {
    setUser(null);
    api.post("/auth/logout").catch(() => {});

    /*
     * Notify the application immediately.
     */
    window.dispatchEvent(
      new CustomEvent("authChanged", {
        detail: {
          user: null,
        },
      })
    );
  };

  /*
   * =====================================================
   * AUTH STATE SYNC
   * =====================================================
   */

  useEffect(() => {
    let mounted = true;
    api.get("/auth/me")
      .then((response) => mounted && setUser(response.data.user))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}