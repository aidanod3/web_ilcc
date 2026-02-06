import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Autograder from './pages/Autograder.jsx';
import Main from './pages/Main.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/main" replace />} />
        <Route path="/main" element={<Main />} />
        <Route path="/autograder" element={<Autograder />} />
      </Routes>
    </BrowserRouter>
  );
}
