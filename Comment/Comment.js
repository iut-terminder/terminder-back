import express from 'express';
import Comment from './CommentSchema.js';
import { optionalAuth, requireAuth, requireStaff } from '../middleware/auth.js';

const CommentAPI = express.Router();

const PAGE_SIZE = 20;

CommentAPI.post('/', optionalAuth, async (req, res) => {
  const { text } = req.body;

  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'متن کامنت نمی‌تواند خالی باشد' });
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({ error: 'متن کامنت بیش از حد طولانی است' });
    }

    const comment = new Comment({
      text: text.trim(),
      user: req.user?.id || null,
    });
    await comment.save();

    return res.status(201).json({ message: 'کامنت شما با موفقیت ثبت شد' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// لیست کامنت‌ها با صفحه‌بندی — فقط ادمین.
// GET /api/comments?page=1  (هر صفحه 20 کامنت، جدیدترین‌ها ابتدا)
CommentAPI.get('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [comments, total] = await Promise.all([
      Comment.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate('user', 'student_no first_name last_name email'),
      Comment.countDocuments(),
    ]);

    return res.status(200).json({
      comments,
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default CommentAPI;
