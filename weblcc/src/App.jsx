import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LabsProvider } from './context/LabsContext.jsx';
import Autograder from './pages/Autograder.jsx';
import Main from './pages/Main.jsx';
import Management from './pages/Management.jsx';
import LabModify from './pages/LabModify.jsx';
import LabList from './pages/LabList.jsx';
import Submissions from './pages/Submissions.jsx';

export default function App() {
  return (
    <LabsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/Main" replace />} />
          <Route path="/main" element={<Main />} />
          <Route path="/autograder" element={<Autograder />} />
          <Route path="/management" element={<Management />} />
          <Route path="/labmodify" element={<LabModify />} />
          <Route path="/lablist" element={<LabList />} />
          <Route path="/submissions" element={<Submissions />} />
        </Routes>
      </BrowserRouter>
    </LabsProvider>
  );
}