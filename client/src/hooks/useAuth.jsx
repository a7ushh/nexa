import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';
import { companies as companiesApi } from '../api/resources.js';

const AuthContext = createContext(null);

/**
 * Holds the sign-in stage returned by /api/auth/me plus the chosen company.
 * Every auth screen and the app shell are driven from `stage`.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ stage: null, user: null, companyId: null });
  const [company, setCompany] = useState(null);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const session = await authApi.getSession();
      setState(session);
      return session;
    } catch {
      setState({ stage: authApi.STAGE.SIGNED_OUT, user: null, companyId: null });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    authApi
      .getConfig()
      .then((config) => setGoogleConfigured(config.googleConfigured))
      .catch(() => setGoogleConfigured(false));
    refresh();
  }, [refresh]);

  // Re-hydrate the company name when a session already carries a company id
  // (for example after a page reload).
  useEffect(() => {
    if (!state.companyId || company?.id === state.companyId) return;
    companiesApi
      .list()
      .then(({ companies }) => {
        setCompany(companies.find((item) => item.id === state.companyId) ?? null);
      })
      .catch(() => setCompany(null));
  }, [state.companyId, company?.id]);

  const chooseCompany = useCallback(async (id) => {
    const chosen = await companiesApi.select(id);
    setCompany(chosen);
    setState((current) => ({ ...current, companyId: chosen.id }));
    return chosen;
  }, []);

  const leaveCompany = useCallback(() => {
    setCompany(null);
    setState((current) => ({ ...current, companyId: null }));
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setCompany(null);
    setState({ stage: authApi.STAGE.SIGNED_OUT, user: null, companyId: null });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      company,
      loading,
      googleConfigured,
      refresh,
      apply: setState,
      chooseCompany,
      leaveCompany,
      signOut,
    }),
    [state, company, loading, googleConfigured, refresh, chooseCompany, leaveCompany, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
