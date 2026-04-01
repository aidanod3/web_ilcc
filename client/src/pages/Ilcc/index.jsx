// export default function Dashboard() {
//   return (
//     <div>
//         <h1>Ilcc</h1>
//     </div>
//   );
// }
import { useState, useEffect } from 'react';
export default function Dashboard() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data));
  }, []);

  return (
    <div>
      <h1>Ilcc</h1>
      <div>{health ? JSON.stringify(health) : 'Loading...'}</div>
    </div>
  );
}