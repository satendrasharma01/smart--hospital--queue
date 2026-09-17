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

  // Legacy page guards still consume this value; authentication itself uses
  // the HttpOnly accessToken cookie.
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
   *
   * The API client automatically refreshes an expired access token
   * before a protected request is retried. Therefore /auth/me can be
   * used safely on page load and after a reload without logging the
   * user out merely because the short-lived access token expired.
   */

  useEffect(() => {
    let mounted = true;

    const handleSessionExpired = () => {
      if (!mounted) {
        return;
      }

      setUser(null);
      window.dispatchEvent(
        new CustomEvent("authChanged", {
          detail: {
            user: null,
          },
        })
      );
    };

    window.addEventListener("authSessionExpired", handleSessionExpired);

    api
      .get("/auth/me")
      .then((response) => {
        if (!mounted) {
          return;
        }

        setUser(response.data.user);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        // At this point api.js has already attempted the refresh flow.
        // A failed refresh means the actual session is no longer valid.
        setUser(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      window.removeEventListener(
        "authSessionExpired",
        handleSessionExpired
      );
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
