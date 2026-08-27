/*
 * Autograder — TA grading UI. Mounted at /autograder/* (TA-gated in App.jsx).
 */
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Assignments from './Assignments';
import AssignmentForm from './AssignmentForm';
import Grade from './Grade';

function SubmissionsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/autograder/${id}`} replace />;
}

export default function Autograder() {
  return (
    <Routes>
      <Route path="/" element={<Assignments />} />
      <Route path="new" element={<AssignmentForm />} />
      <Route path=":id/edit" element={<AssignmentForm />} />
      <Route path=":id/submissions" element={<SubmissionsRedirect />} />
      <Route path=":id" element={<Grade />} />
      <Route path="*" element={<Navigate to="/autograder" replace />} />
    </Routes>
  );
}
