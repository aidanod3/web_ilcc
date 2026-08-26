import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Ilcc from './pages/ilcc';

/* The app is served under a URL prefix in production (/ilcc). Vite bakes it
   into import.meta.env.BASE_URL from VITE_BASE; strip the trailing slash for
   React Router's basename. In dev BASE_URL is "/" → basename "". */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Ilcc />} />
        {/* Legacy deep link from the student-pod era. */}
        <Route path="/ilcc" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
