import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LabsProvider } from './context/LabsContext.jsx';
import Home from './pages/Home.jsx';
import Ilcc from './pages/Ilcc.jsx';
import Docs from './pages/Docs.jsx';
import Settings from './pages/Settings.jsx';
import Autograder from './pages/Autograder.jsx';
import Management from './pages/Management.jsx';
import LabModify from './pages/LabModify.jsx';
import LabList from './pages/LabList.jsx';
import Submissions from './pages/Submissions.jsx';

export default function App() {
  return (
    <LabsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ilcc" element={<Ilcc />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/settings" element={<Settings />} />
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
