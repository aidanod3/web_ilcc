/*
 * useMe — who is signed in. Fetches /api/me once per page load and shares it.
 *
 *   const { me, loading, isSignedIn, isTA, isAdmin, refresh } = useMe();
 *   me = { email, netid, role } | { anonymous: true }
 *
 * loginUrl points at a forward-auth'd route so navigating there triggers the
 * SAML redirect; hydra-auth sends the browser back afterwards.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
export const loginUrl = (returnTo = window.location.pathname) =>
  `${API}/me?login=1&return=${encodeURIComponent(returnTo)}`;

const MeContext = createContext(null);

export function MeProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API}/me`, { credentials: 'same-origin' });
      setMe(r.ok ? await r.json() : { anonymous: true });
    } catch {
      setMe({ anonymous: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = {
    me, loading, refresh,
    isSignedIn: !!me && !me.anonymous,
    isTA: me?.role === 'ta' || me?.role === 'admin',
    isAdmin: me?.role === 'admin',
  };
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export default function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used inside <MeProvider>');
  return ctx;
}
