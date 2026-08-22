const fetch = globalThis.fetch;
const splitCookies = (s) => {
  if (!s) return [];
  if (Array.isArray(s)) return s.flatMap((h) => h.split(/,\s*(?=[^=]+=)/g).map((c) => c.split(';', 1)[0]));
  return s.split(/,\s*(?=[^=]+=)/g).map((c) => c.split(';', 1)[0]);
};
(async () => {
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrf = await csrfRes.json();
  console.log('csrf status', csrfRes.status);
  console.log('csrf set-cookie header', csrfRes.headers.get('set-cookie'));
  const csrfCookies = splitCookies(csrfRes.headers.get('set-cookie'));
  console.log('csrf parsed cookies', csrfCookies);
  const csrfCookie = csrfCookies.join('; ');
  console.log('csrf cookie string', csrfCookie);
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    identifier: 'admin@school.edu',
    password: 'admin123',
    role: 'ADMIN',
    callbackUrl: 'http://localhost:3000/admin',
  });
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    body: form,
    redirect: 'manual',
    headers: { cookie: csrfCookie },
  });
  console.log('login status', loginRes.status);
  console.log('login headers', Object.fromEntries(loginRes.headers.entries()));
  console.log('login set-cookie', loginRes.headers.get('set-cookie'));
  const loginCookies = splitCookies(loginRes.headers.get('set-cookie'));
  console.log('login parsed cookies', loginCookies);
  const authCookie = loginCookies.join('; ');
  console.log('auth cookie string', authCookie);
  const allCookies = [csrfCookie, authCookie].filter(Boolean).join('; ');
  console.log('all cookies', allCookies);
  const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
    headers: { cookie: allCookies },
  });
  console.log('session status', sessionRes.status);
  console.log('session body', await sessionRes.text());
  const teachersRes = await fetch('http://localhost:3000/api/admin/teachers', {
    headers: { cookie: allCookies },
  });
  console.log('teachers status', teachersRes.status);
  console.log('teachers body', await teachersRes.text());
})();
