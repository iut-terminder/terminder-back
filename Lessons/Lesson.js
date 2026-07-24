import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import Lesson from './LessonSchema.js';
import Department from '../Department/DepartmentSchema.js';
import { parseInstructors, parseScheduleAndExam, normalizeFaText } from './functions.js';
import { requireAuth, requireStaff, optionalAuth } from '../middleware/auth.js';

const LessonAPI = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ---------- لیست/فیلتر دروس (عمومی، با پشتیبانی از department_id و include_inactive) ----------
LessonAPI.get('/', optionalAuth, async (req, res) => {
  try {
    const { department_id, include_inactive } = req.query;
    const filter = {};

    if (department_id) {
      const department = await Department.findOne({ dept_id: Number(department_id) });
      if (!department) {
        return res.status(200).json([]);
      }
      filter.department_id = department._id;
    }

    const isAdmin = req.user && req.user.is_staff;
    if (!(include_inactive === '1' && isAdmin)) {
      filter.is_active = true;
    }

    const lessons = await Lesson.find(filter).populate('department_id').sort({ lesson_id: 1 });
    return res.status(200).json(lessons);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ---------- آپلود اکسل دروس یک دانشکده (فقط ادمین) ----------
LessonAPI.post('/upload-lessons', requireAuth, requireStaff, upload.single('excel_file'), async (req, res) => {
  const { department_id } = req.body;

  try {
    if (!department_id) {
      return res.status(400).json({ error: 'شناسه‌ی دانشکده الزامی است' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'فایل اکسل الزامی است' });
    }

    const departmentIdNum = Number(department_id);
    const department = await Department.findOne({ dept_id: departmentIdNum });
    if (!department) {
      return res.status(404).json({ error: 'دانشکده‌ی مورد نظر یافت نشد' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // header: 1 یعنی هر سطر یک آرایه‌ی خام از سلول‌هاست (معادل df.iloc[i] در pandas)
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const createdLessons = [];
    const changedLessons = [];
    const reactivatedLessons = [];
    const notchangedLessons = [];
    const errors = [];

    // ابتدا همه‌ی دروس این دانشکده غیرفعال می‌شوند؛ هر درسی که در ادامه‌ی این فایل
    // اکسل واقعاً پردازش شود، دوباره فعال می‌شود. دروسی که در فایل جدید نیستند
    // (یعنی از دانشکده حذف شده‌اند) غیرفعال باقی می‌مانند.
    await Lesson.updateMany({ department_id: department._id }, { $set: { is_active: false } });

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      let lessonId = '';

      try {
        const cell = (i) => (row[i] !== undefined && row[i] !== null ? row[i] : null);

        const lessonIdRaw = cell(0) !== null ? String(cell(0)).trim() : '';
        lessonId = lessonIdRaw.replace(/_/g, '');

        if (!lessonId) continue;

        const lessonName = cell(1) !== null ? String(cell(1)).trim() : '';
        const credit = cell(2) !== null ? parseInt(cell(2), 10) : 0;
        const activeCredit = cell(3) !== null ? parseFloat(cell(3)) : 0.0;
        const capacity = cell(4) !== null ? parseInt(cell(4), 10) : 0;

        const genderText = cell(6) !== null ? (cell(7) !== null ? String(cell(7)).trim() : '') : 'مختلط';
        const genderMap = { 'مختلط': 0, 'مرد': 1, 'زن': 2 };
        const gender = genderMap[genderText] ?? 0;

        const instructorRespColumn = normalizeFaText(row.length > 8 ? cell(10) : '');
        let instructorsList = parseInstructors(instructorRespColumn);

        if (instructorsList.length === 0 && cell(6) !== null) {
          instructorsList = [String(cell(6)).trim()];
        }

        const scheduleColumnText = normalizeFaText(row.length > 5 ? cell(11) : '');
        const { timesList: times, examInfo: examTime } = parseScheduleAndExam(scheduleColumnText);

        const description = row.length > 5 && cell(12) !== null ? normalizeFaText(cell(12)) : '';

        // درس باید متعلق به همین دانشکده باشد (بر اساس کد درس)
        if (Math.floor(parseInt(lessonId, 10) / 10000000) !== departmentIdNum) {
          continue;
        }

        let lesson = await Lesson.findOne({ lesson_id: lessonId, department_id: department._id });
        let hasChange = false;

        if (lesson) {
          const wasInactive = !lesson.is_active;

          // ۱. تبدیل سند مانگوس به آبجکت معمولی جاوااسکریپت جهت مقایسه تمیز
          const lessonObj = lesson.toObject();

          if (lesson.lesson_name !== lessonName) { lesson.lesson_name = lessonName; hasChange = true; }
          if (lesson.credit !== credit) { lesson.credit = credit; hasChange = true; }
          if (lesson.active_credit !== activeCredit) { lesson.active_credit = activeCredit; hasChange = true; }
          if (lesson.capacity !== capacity) { lesson.capacity = capacity; hasChange = true; }
          if (lesson.gender !== gender) { lesson.gender = gender; hasChange = true; }
          
          // ۲. پاک‌سازی _idهای مانگوس قبل از JSON.stringify برای مقایسه دقیق
          const cleanDbInstructors = JSON.stringify(lessonObj.instructors_list || []);
          const cleanNewInstructors = JSON.stringify(instructorsList || []);
          if (cleanDbInstructors !== cleanNewInstructors) {
            lesson.instructors_list = instructorsList; 
            hasChange = true;
          }

          // پاک‌سازی مرتب‌سازی زمان‌ها قبل از مقایسه
          const cleanDbTimes = JSON.stringify(lessonObj.times || []);
          const cleanNewTimes = JSON.stringify(times || []);
          if (cleanDbTimes !== cleanNewTimes) {
            lesson.times = times; 
            hasChange = true;
          }

          const cleanDbExam = JSON.stringify(lessonObj.exam_time || {});
          const cleanNewExam = JSON.stringify(examTime || {});
          if (cleanDbExam !== cleanNewExam) {
            lesson.exam_time = examTime; 
            hasChange = true;
          }

          if ((lesson.description || '') !== description) { lesson.description = description; hasChange = true; }

          lesson.is_active = true;
          await lesson.save();

          const lessonReport = {
            lesson_id: lesson.lesson_id,
            lesson_name: lesson.lesson_name,
            instructors: lesson.instructors_list,
            credit: lesson.credit,
          };

          if (hasChange) {
            changedLessons.push(lessonReport);
          } else if (wasInactive) {
            reactivatedLessons.push(lessonReport);
          } else {
            notchangedLessons.push(lessonReport);
          }
        }
      } catch (rowError) {
        errors.push(`ردیف ${index + 1} (کد درس ${lessonId}): خطای پردازش داده - ${rowError.message}`);
      }
    }

    const summaryMessage =
      `${createdLessons.length} درس جدید اضافه شد، ` +
      `${changedLessons.length} درس به‌روزرسانی شد، ` +
      `${reactivatedLessons.length} درس مجدداً فعال شد، ` +
      `${notchangedLessons.length} درس بدون تغییر بود`;

    return res.status(errors.length === 0 ? 201 : 400).json({
      success: errors.length === 0,
      message: summaryMessage,
      created_lessons: createdLessons,
      changed_lessons: changedLessons,
      reactivated_lessons: reactivatedLessons,
      notchanged_lessons: notchangedLessons,
      errors,
    });
  } catch (err) {
    return res.status(400).json({ error: `خطای سیستمی: ${err.message}` });
  }
});

export default LessonAPI;
