import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Autograder from './pages/Autograder.jsx';
import Ilcc from './pages/Ilcc.jsx';

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
