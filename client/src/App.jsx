import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MeProvider } from './hooks/useMe';
import ErrorBoundary from './components/ErrorBoundary';
import RequireRole from './components/RequireRole';
import Ilcc from './pages/ilcc';

/* Secondary pages are code-split so the editor bundle stays lean. */
const Setup       = lazy(() => import('./pages/setup'));
const Faq         = lazy(() => import('./pages/faq'));
const Docs        = lazy(() => import('./pages/docs'));
const Downloads   = lazy(() => import('./pages/downloads'));
const Materials   = lazy(() => import('./pages/materials'));
const Examples    = lazy(() => import('./pages/examples'));
const MySubs      = lazy(() => import('./pages/my-submissions'));
const Autograder  = lazy(() => import('./pages/autograder'));

/* The app is served under a URL prefix in production (/ilcc). Vite bakes it
   into import.meta.env.BASE_URL from VITE_BASE; strip the trailing slash for
   React Router's basename. In dev BASE_URL is "/" → basename "". */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

const Fallback = () => <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Loading…</div>;

export default function App() {
  return (
    <ErrorBoundary>
      <MeProvider>
        <BrowserRouter basename={basename}>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/" element={<Ilcc />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/examples" element={<Examples />} />
              <Route path="/downloads" element={<RequireRole role="sso"><Downloads /></RequireRole>} />
              <Route path="/materials" element={<RequireRole role="sso"><Materials /></RequireRole>} />
              <Route path="/my-submissions" element={<RequireRole role="sso"><MySubs /></RequireRole>} />
              <Route path="/autograder/*" element={<RequireRole role="ta"><Autograder /></RequireRole>} />
              {/* Legacy deep link from the student-pod era. */}
              <Route path="/ilcc" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </MeProvider>
    </ErrorBoundary>
  );
}
