import { useState } from 'react';
import npLogo from './Images/npLogo.png';

export default function Management() {
  const [hoveredName, setHoveredName] = useState(null);
  const totalNames = 7;

  return (
    <main
      className="page"
      style={{
        minHeight: '100vh',
        background: '#f8fafc'
      }}
    >
    </main>
  );
}