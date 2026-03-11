import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Autograder from './pages/Autograder.jsx';
import Main from './pages/Main.jsx';
import Management from './pages/Management.jsx';
import NewLab from './pages/NewLab.jsx';
import LabGrade from './pages/LabGrade.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/Main" replace />} />
        <Route path="/main" element={<Main />} />
        <Route path="/autograder" element={<Autograder />} />
        <Route path="/management" element={<Management />} />
        <Route path="/newlab" element={<NewLab />} />
        <Route path="/labgrade" element={<LabGrade />} />
      </Routes>
    </BrowserRouter>
  );
}