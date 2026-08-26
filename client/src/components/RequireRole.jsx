/*
 * RequireRole — route guard. role: 'sso' | 'ta' | 'admin'.
 * Traefik already redirects anonymous users to SAML for these paths, so the
 * anonymous branch here mostly covers dev without a proxy.
 */
import { LogIn, ShieldAlert } from 'lucide-react';
import useMe, { loginUrl } from '../hooks/useMe';
import Page from './Page';
import ps from './Page.module.css';

export default function RequireRole({ role = 'sso', children }) {
  const { loading, isSignedIn, isTA, isAdmin } = useMe();
  if (loading) return <Page><div className={ps.empty}><span className={ps.spinner} /></div></Page>;

  if (!isSignedIn) {
    return (
      <Page title="Sign in required">
        <div className={ps.card}>
          <p className={ps.p}>This page is for SUNY New Paltz students and staff. Sign in with your campus account to continue.</p>
          <a className={ps.btnPrimary} href={loginUrl()}><LogIn size={14} /> Sign in with SUNY SSO</a>
        </div>
      </Page>
    );
  }
  const ok = role === 'sso' || (role === 'ta' && isTA) || (role === 'admin' && isAdmin);
  if (!ok) {
    return (
      <Page title="Staff only">
        <div className={ps.card}>
          <p className={ps.p}><ShieldAlert size={16} /> Your account isn't on the staff list for this course. If you're a TA, ask the professor or an admin to add you (Help → their Staff menu).</p>
        </div>
      </Page>
    );
  }
  return children;
}
