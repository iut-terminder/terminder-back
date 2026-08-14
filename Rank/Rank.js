import express from 'express';
import RankEntry from './RankEntrySchema.js';
import Field from '../Field/FieldSchema.js';
import { requireAuth } from '../middleware/auth.js';

const RankAPI = express.Router();

const VALID_ENTRY_YEARS = [400, 401, 402, 403, 404];

// ---------- وضعیت ثبت کاربر لاگین‌شده (برای تشخیص نمایش فرم یا نتیجه) ----------
RankAPI.get('/me', requireAuth, async (req, res) => {
  try {
    const entry = await RankEntry.findOne({ user: req.user.id })
      .populate('field', 'field_id field_name');

    return res.status(200).json({ entry: entry || null });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ---------- ثبت انتخاب — هر کاربر فقط یک‌بار ----------
RankAPI.post('/', requireAuth, async (req, res) => {
  const { hour, minute, field, entry_year } = req.body;

  try {
    if (hour === undefined || minute === undefined || !field || !entry_year) {
      return res.status(400).json({ error: 'تمام فیلدها (ساعت، دقیقه، رشته و ورودی) الزامی است' });
    }

    const hourNum = Number(hour);
    const minuteNum = Number(minute);
    const entryYearNum = Number(entry_year);

    if (!Number.isInteger(hourNum) || !Number.isInteger(minuteNum)) {
      return res.status(400).json({ error: 'ساعت و دقیقه باید عدد صحیح باشند' });
    }

    if (minuteNum < 0 || minuteNum > 59) {
      return res.status(400).json({ error: 'دقیقه باید بین 0 تا 59 باشد' });
    }

    const totalMinutes = hourNum * 60 + minuteNum;
    if (totalMinutes < 8 * 60 || totalMinutes > 13 * 60) {
      return res.status(400).json({ error: 'ساعت انتخابی باید بین 08:00 تا 13:00 باشد' });
    }

    if (!VALID_ENTRY_YEARS.includes(entryYearNum)) {
      return res.status(400).json({ error: 'ورودی انتخابی معتبر نیست' });
    }

    const fieldExists = await Field.findById(field);
    if (!fieldExists) {
      return res.status(400).json({ error: 'رشته‌ی انتخابی یافت نشد' });
    }

    // هر کاربر فقط یک‌بار می‌تواند ثبت کند — این محدودیت هم اینجا و هم با
    // ایندکس unique روی فیلد user در سطح دیتابیس تضمین می‌شود (جلوگیری از race condition)
    const already = await RankEntry.findOne({ user: req.user.id });
    if (already) {
      return res.status(400).json({ error: 'شما قبلاً ساعت، رشته و ورودی خود را ثبت کرده‌اید' });
    }

    const entry = new RankEntry({
      user: req.user.id,
      hour: hourNum,
      minute: minuteNum,
      field,
      entry_year: entryYearNum,
    });
    await entry.save();
    await entry.populate('field', 'field_id field_name');

    return res.status(201).json({ entry });
  } catch (err) {
    // خطای unique index مونگو (کد 11000) یعنی درخواست هم‌زمان دوم رد شده
    if (err.code === 11000) {
      return res.status(400).json({ error: 'شما قبلاً ساعت، رشته و ورودی خود را ثبت کرده‌اید' });
    }
    return res.status(400).json({ error: err.message });
  }
});

// ---------- محاسبه‌ی رتبه‌ی کاربر لاگین‌شده در همان رشته و ورودی ----------
RankAPI.get('/result', requireAuth, async (req, res) => {
  try {
    const myEntry = await RankEntry.findOne({ user: req.user.id });
    if (!myEntry) {
      return res.status(404).json({ error: 'شما هنوز ساعت، رشته و ورودی خود را ثبت نکرده‌اید' });
    }

    // نفرات قبل از او: در همان رشته و همان ورودی، کسانی که ساعت زودتری انتخاب کرده‌اند
    const beforeCount = await RankEntry.countDocuments({
      field: myEntry.field,
      entry_year: myEntry.entry_year,
      total_minutes: { $lt: myEntry.total_minutes },
    });

    // تعداد افرادی که دقیقاً همان ساعت:دقیقه را در همان رشته و ورودی انتخاب کرده‌اند (شامل خودش)
    const sameTimeCount = await RankEntry.countDocuments({
      field: myEntry.field,
      entry_year: myEntry.entry_year,
      total_minutes: myEntry.total_minutes,
    });

    const totalInGroup = await RankEntry.countDocuments({
      field: myEntry.field,
      entry_year: myEntry.entry_year,
    });

    return res.status(200).json({
      before_count: beforeCount,
      same_time_count: sameTimeCount,
      total_in_group: totalInGroup,
      rank_from: beforeCount + 1,
      rank_to: beforeCount + sameTimeCount,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default RankAPI;
