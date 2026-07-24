import express from 'express';
import jwt from 'jsonwebtoken';
import RefreshToken from './tokensSchema.js';
import User from '../Users/UserSchema.js';

const RefreshTokenAPI = express.Router();

RefreshTokenAPI.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return res.status(400).json({ error: 'رفرش توکن الزامی است' });
    }

    const tokenRecord = await RefreshToken.findOne({ token: String(refreshToken).trim() });
    if (!tokenRecord) {
      return res.status(401).json({ error: 'رفرش توکن نامعتبر است' });
    }

    const payload = jwt.verify(refreshToken, process.env.AUTH_REFRESH_TOKEN_SECRET);

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'کاربر یافت نشد' });
    }

    const newAccessToken = jwt.sign(
      {
        id: user._id.toString(),
        student_no: user.student_no,
        is_staff: user.is_staff,
        fullname: `${user.first_name} ${user.last_name}`,
      },
      process.env.AUTH_ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '1h' }
    );

    return res.status(200).json({ access: newAccessToken });
  } catch (err) {
    return res.status(401).json({ error: 'رفرش توکن نامعتبر یا منقضی شده است' });
  }
});

RefreshTokenAPI.post('/delete', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const tokenRecord = await RefreshToken.findOne({ token: String(refreshToken || '').trim() });
    if (!tokenRecord) {
      return res.status(404).json({ error: 'توکن یافت نشد' });
    }

    await tokenRecord.deleteOne();
    return res.status(200).json({ message: 'خروج با موفقیت انجام شد' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default RefreshTokenAPI;
