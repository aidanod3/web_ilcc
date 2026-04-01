import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import Home from './pages/Home';
import Ilcc from './pages/ilcc';
// import Autograder from './pages/Autograder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<Home />} /> */}
        <Route path="/ilcc" element={<Ilcc />} />
        {/* <Route path="/autograder" element={<Autograder />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
