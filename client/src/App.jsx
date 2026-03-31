import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Ilcc from './pages/Ilcc';
import Autograder from './pages/Autograder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/ilcc" replace />} />
        <Route path="/ilcc" element={<Ilcc />} />
        <Route path="/autograder" element={<Autograder />} />
      </Routes>
    </BrowserRouter>
  );
}
