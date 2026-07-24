import express from 'express';
import User from '../Users/UserSchema.js';
import { requireAuth } from '../middleware/auth.js';

const ScheduleAPI = express.Router();
const MAX_SCHEDULES_PER_USER = 5;

const cleanupInactiveItems = async (user) => {
  const removedLessons = [];
  let didRemoveAny = false;

  for (const schedule of user.schedules) {
    const keptItems = [];
    for (const item of schedule.items) {
      // با populate پیشین، item.lesson یک سند کامل Lesson است
      if (item.lesson && item.lesson.is_active === false) {
        removedLessons.push(item.lesson);
        didRemoveAny = true;
      } else {
        keptItems.push(item);
      }
    }
    schedule.items = keptItems;
  }

  if (didRemoveAny) {
    await user.save();
  }

  return removedLessons;
};

// ---------- لیست همه‌ی برنامه‌های کاربر لاگین‌شده ----------
ScheduleAPI.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('schedules.items.lesson');
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    const removedLessons = await cleanupInactiveItems(user);

    return res.status(200).json({
      schedules: user.schedules,
      removed_lessons: removedLessons,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ---------- ساخت برنامه‌ی جدید (حداکثر ۵ تا) ----------
ScheduleAPI.post('/', requireAuth, async (req, res) => {
  const { title, items } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    if (user.schedules.length >= MAX_SCHEDULES_PER_USER) {
      return res.status(400).json({
        error: `شما نمی‌توانید بیش از ${MAX_SCHEDULES_PER_USER} برنامه داشته باشید. لطفاً ابتدا یکی از برنامه‌های قبلی را حذف کنید`,
      });
    }

    user.schedules.push({
      title: title || 'برنامه من',
      items: (items || []).map((it) => ({ lesson: it.lesson, color: it.color || '#248F24' })),
    });
    await user.save();

    const newSchedule = user.schedules[user.schedules.length - 1];
    await user.populate('schedules.items.lesson');

    return res.status(201).json(user.schedules.id(newSchedule._id));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ---------- به‌روزرسانی کامل یک برنامه (جایگزینی items) ----------
ScheduleAPI.put('/:scheduleId', requireAuth, async (req, res) => {
  const { scheduleId } = req.params;
  const { title, items } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    const schedule = user.schedules.id(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'برنامه‌ی مورد نظر یافت نشد' });
    }

    if (title !== undefined) schedule.title = title;
    if (items !== undefined) {
      schedule.items = items.map((it) => ({ lesson: it.lesson, color: it.color || '#248F24' }));
    }

    await user.save();
    await user.populate('schedules.items.lesson');

    return res.status(200).json(user.schedules.id(scheduleId));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ---------- حذف کامل یک برنامه ----------
ScheduleAPI.delete('/:scheduleId', requireAuth, async (req, res) => {
  const { scheduleId } = req.params;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    const schedule = user.schedules.id(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'برنامه‌ی مورد نظر یافت نشد' });
    }

    schedule.deleteOne();
    await user.save();

    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default ScheduleAPI;
