const accessCookie = 'bl_access';
const refreshCookie = 'bl_refresh';
const refreshCookieMaxAge = 30 * 24 * 60 * 60 * 1000;
const secureCookies = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: secureCookies ? 'none' : 'lax',
  path: '/',
};

export function getAuthCookie(req, name) {
  const entry = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

export function setAuthCookies(res, session) {
  res.set('Cache-Control', 'no-store');
  res.cookie(accessCookie, session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in * 1000,
  });
  res.cookie(refreshCookie, session.refresh_token, {
    ...cookieOptions,
    maxAge: refreshCookieMaxAge,
  });
}

export function clearAuthCookies(res) {
  res.set('Cache-Control', 'no-store');
  res.clearCookie(accessCookie, cookieOptions);
  res.clearCookie(refreshCookie, cookieOptions);
}

export const authCookieNames = { accessCookie, refreshCookie };
