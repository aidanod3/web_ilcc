import { API } from '../../hooks/useMe';

export const fmtDate = (s) => (s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtScore = (score, max) => (score == null ? '—' : `${Number(score) % 1 ? Number(score).toFixed(1) : score}/${max ?? '?'}`);
export const exportUrl = (id) => `${API}/grader/assignments/${id}/export.csv`;
/* ISO/SQL timestamp → value for <input type="datetime-local"> (local time). */
export const toLocalInput = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
