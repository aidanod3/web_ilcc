/* Single source of truth for where the code lives. */
export const REPO_URL = 'https://github.com/compsci-suny-newpaltz/ilcc';
export const REPO_NAME = 'compsci-suny-newpaltz/ilcc';
export const ISSUES_URL = `${REPO_URL}/issues`;

export function newIssueUrl({ title = '', body = '' } = {}) {
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function bugReportUrl(extra = '') {
  const body = [
    '**What happened?**', '', '',
    '**Steps to reproduce**', '1.', '',
    extra,
    `**Page:** ${window.location.href}`,
    `**Browser:** ${navigator.userAgent}`,
  ].join('\n');
  return newIssueUrl({ body });
}
