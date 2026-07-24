import jwt from 'jsonwebtoken';

/**
 * میدل‌ور احراز هویت. توکن را از هدر Authorization (فرمت Bearer) می‌خواند،
 * اعتبارسنجی می‌کند و payload را در req.user قرار می‌دهد.
 * معادل IsAuthenticated در Django REST Framework.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'برای این عملیات لازم است وارد حساب کاربری خود شوید' });
  }

  try {
    const payload = jwt.verify(token, process.env.AUTH_ACCESS_TOKEN_SECRET);
    req.user = payload; // شامل: id, student_no, is_staff
    next();
  } catch (err) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی شده است' });
  }
};

/**
 * میدل‌ور دسترسی ادمین. باید بعد از requireAuth استفاده شود.
 * معادل IsAdminUser در Django REST Framework.
 */
export const requireStaff = (req, res, next) => {
  if (!req.user || !req.user.is_staff) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای این عملیات را ندارید' });
  }
  next();
};

/**
 * میدل‌ور احراز هویت اختیاری: اگر توکن معتبر بود req.user را پر می‌کند،
 * وگرنه بدون خطا ادامه می‌دهد. معادل AllowAny با تشخیص کاربر لاگین‌شده.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.AUTH_ACCESS_TOKEN_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
};
