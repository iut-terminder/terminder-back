import express from 'express';
import jwt from 'jsonwebtoken';
import User from './UserSchema.js';
import RefreshToken from '../tokens/tokensSchema.js';
import { requireAuth } from '../middleware/auth.js';
import { sendActivationEmail, sendPasswordResetEmail } from '../services/mail.js';
import StudentEmail from './StudentEmailSchema.js'; 

const UserAPI = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ثبت نام
UserAPI.post('/register', async (req, res) => {
  const {student_no, first_name, last_name, phone, password,} = req.body;

  try {
    if (!student_no || !password) {
      return res.status(400).json({
        error: 'شماره دانشجویی و رمز عبور الزامی است',
      });
    }

    if (String(password).trim().length < 6) {
      return res.status(400).json({
        error: 'رمز عبور باید حداقل ۶ کاراکتر باشد',
      });
    }

    const normalizedStudentNo = String(student_no).trim();

    const studentEmail = await StudentEmail.findOne({
      student_no: normalizedStudentNo,
    });

    if (!studentEmail) {
      return res.status(400).json({
        error: 'این شماره دانشجویی در لیست دانشجویان دانشگاه وجود ندارد',
      });
    }

    const existing = await User.findOne({
      student_no: normalizedStudentNo,
    });

    if (existing) {
      return res.status(400).json({
        error: 'این شماره دانشجویی قبلاً ثبت‌نام کرده است',
      });
    }

    const user = new User({
      student_no: normalizedStudentNo,
      first_name: first_name && String(first_name).trim() ? String(first_name).trim() : null,
      last_name: last_name && String(last_name).trim() ? String(last_name).trim() : null,
      email: studentEmail.email,
      phone: phone ? String(phone).trim() : null,
      is_active: false,
      is_staff: false,
    });

    await user.setPassword(password);
    await user.save();

    try {
      const activationToken = jwt.sign(
        {
          userId: user._id.toString(),
        },
        process.env.AUTH_EMAIL_TOKEN_SECRET,
        {
          expiresIn: '1d',
        }
      );

      const activationLink =
        `${FRONTEND_URL}/#/verify-email/` +
        `${user._id}/${activationToken}`;

      await sendActivationEmail(
        user.email,
        activationLink
      );

      return res.status(201).json({
        message:
          'ثبت‌نام با موفقیت انجام شد. لینک فعال‌سازی به ایمیل دانشگاهی شما ارسال گردید',
      });
    } catch (mailErr) {
      await User.deleteOne({
        _id: user._id,
      });

      return res.status(500).json({
        error: `خطا در ارسال ایمیل فعال‌سازی: ${mailErr.message}`,
      });
    }
  } catch (err) {
    return res.status(400).json({
      error: err.message,
    });
  }
});

// ---------- تایید ایمیل ----------
UserAPI.post('/verify-email/:userId/:token', async (req, res) => {
  const { userId, token } = req.params;

  try {
    const payload = jwt.verify(token, process.env.AUTH_EMAIL_TOKEN_SECRET);
    if (payload.userId !== userId) {
      return res.status(400).json({ error: 'لینک تایید نامعتبر یا منقضی شده است' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: 'لینک تایید نامعتبر یا منقضی شده است' });
    }

    if (user.is_active) {
      return res.status(400).json({ message: 'این حساب کاربری قبلاً فعال شده است' });
    }

    user.is_active = true;
    await user.save();

    return res.status(200).json({ message: 'حساب کاربری شما با موفقیت فعال شد. اکنون می‌توانید لاگین کنید' });
  } catch (err) {
    return res.status(400).json({ error: 'لینک تایید نامعتبر یا منقضی شده است' });
  }
});

// ---------- لاگین ----------
UserAPI.post('/login', async (req, res) => {
  const { student_no, password } = req.body;

  try {
    const user = await User.findOne({ student_no: String(student_no || '').trim() });

    if (!user || !user.is_active) {
      return res.status(404).json({ detail: 'شماره دانشجویی یا رمز عبور اشتباه است' });
    }

    const isValid = await user.validPassword(password);
    if (!isValid) {
      return res.status(401).json({ detail: 'شماره دانشجویی یا رمز عبور اشتباه است' });
    }

    const payload = {
      id: user._id.toString(),
      student_no: user.student_no,
      is_staff: user.is_staff,
      fullname: `${user.first_name} ${user.last_name}`,
    };

    const accessToken = jwt.sign(payload, process.env.AUTH_ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '1h',
    });
    const refreshToken = jwt.sign(payload, process.env.AUTH_REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.AUTH_REFRESH_TOKEN_EXPIRY || '1d',
    });

    await RefreshToken.create({ userId: user._id, token: refreshToken });

    return res.status(200).json({ access: accessToken, refresh: refreshToken });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ---------- درخواست بازنشانی رمز عبور ----------
UserAPI.post('/request-password-reset', async (req, res) => {
  const { student_no } = req.body;
  const genericMessage = {
    message: 'در صورتی که این شماره دانشجویی در سامانه ثبت شده باشد، لینک بازنشانی رمز عبور به ایمیل مرتبط با آن ارسال خواهد شد',
  };
  try {
    if (!student_no) {
      return res.status(400).json({ error: 'شماره دانشجویی الزامی است' });
    }

    const user = await User.findOne({ student_no: String(student_no).trim() });
    if (!user || !user.is_active) {
      return res.status(200).json(genericMessage);
    }

    try {
      const resetToken = jwt.sign(
        { userId: user._id.toString(), passwordHash: user.password_hash },
        process.env.AUTH_RESET_TOKEN_SECRET,
        { expiresIn: '1h' }
      );
      const resetLink = `${FRONTEND_URL}/#/reset-password/${user._id}/${resetToken}`;
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (mailErr) {
      return res.status(400).json(mailErr);
    }

    return res.status(200).json(genericMessage);
  } catch (err) {
    return res.status(400).json(err);
  }
});

// ---------- تایید و اعمال رمز عبور جدید ----------
UserAPI.post('/reset-password/:userId/:token', async (req, res) => {
  const { userId, token } = req.params;
  const { new_password1, new_password2 } = req.body;

  try {
    const payload = jwt.verify(token, process.env.AUTH_RESET_TOKEN_SECRET);
    if (payload.userId !== userId) {
      return res.status(400).json({ error: 'لینک بازنشانی رمز عبور نامعتبر یا منقضی شده است' });
    }

    const user = await User.findById(userId);
    if (!user || payload.passwordHash !== user.password_hash) {
      return res.status(400).json({ error: 'لینک بازنشانی رمز عبور نامعتبر یا منقضی شده است' });
    }

    if (!new_password1 || !new_password2) {
      return res.status(400).json({ error: 'رمز عبور جدید و تکرار آن الزامی است' });
    }
    if (new_password1 !== new_password2) {
      return res.status(400).json({ new_password2: ['رمز عبور و تکرار آن یکسان نیستند'] });
    }
    if (String(new_password1).trim().length < 6) {
      return res.status(400).json({ new_password1: ['رمز عبور باید حداقل ۶ کاراکتر باشد'] });
    }

    await user.setPassword(new_password1);
    await user.save();

    return res.status(200).json({ message: 'رمز عبور شما با موفقیت تغییر کرد. اکنون می‌توانید با رمز جدید وارد شوید' });
  } catch (err) {
    return res.status(400).json({ error: 'لینک بازنشانی رمز عبور نامعتبر یا منقضی شده است' });
  }
});

// ---------- پروفایل کاربر لاگین‌شده ----------
UserAPI.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }
    return res.status(200).json(user);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default UserAPI;
