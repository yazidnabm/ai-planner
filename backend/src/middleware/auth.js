import { admin } from '../lib/supabase.js';

/**
 * Auth middleware: verify the Supabase access token from the Authorization
 * header, then attach userId + user client to req.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Autentikasi diperlukan' });
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  }

  req.user = data.user;
  req.userId = data.user.id;
  next();
}
