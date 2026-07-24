// استخراج نام استادها از متن مسئولیت درس، مثلاً "دکتر احمدی : استاد درس"
export const parseInstructors = (instructorResponsibilityText) => {
  if (!instructorResponsibilityText) return [];
  const pattern = /([^:\n]+?)\s*:\s*استاد\s+درس/g;
  const matches = [];
  let m;
  while ((m = pattern.exec(String(instructorResponsibilityText))) !== null) {
    const name = m[1].trim();
    if (name) matches.push(name);
  }
  return matches;
};

const DAY_MAP = {
  'یکشنبه': 1,
  'دوشنبه': 2,
  'سهشنبه': 3,
  'چهارشنبه': 4,
  'پنجشنبه': 5,
  'جمعه': 6,
  'شنبه': 0,
};

export const parseScheduleAndExam = (timeText) => {
  const timesList = [];
  let examInfo = {};

  if (!timeText) return { timesList, examInfo };

  // ۱. پاک‌سازی فاصله‌های اضافی و یکدست‌سازی متن
  const text = String(timeText).split(/\s+/).filter(Boolean).join(' ');

  // ۲. پیدا کردن نقاط شروع هر بخش (درس تئوری، عملی، حل تمرین یا امتحان)
  const delimiterPattern = /(درس\(ت\):|درس\(ع\):|درس\(ح\):|حل تمرین:|امتحان\([^)]+\))/;
  const tokens = text.split(delimiterPattern).map((t) => t.trim()).filter(Boolean);

  const headerPattern = /^(درس\(.\):|حل تمرین:|امتحان\([^)]+\))$/;

  const parts = [];
  let currentHeader = '';

  for (const token of tokens) {
    if (headerPattern.test(token)) {
      currentHeader = token;
    } else if (currentHeader) {
      parts.push(`${currentHeader} ${token}`);
      currentHeader = '';
    } else {
      parts.push(token);
    }
  }

  if (currentHeader && currentHeader.startsWith('امتحان')) {
    parts.push(currentHeader);
  }

  // ۳. پردازش هر بخش به‌صورت مجزا
  for (const rawPart of parts) {
    const part = rawPart.trim();

    if (part.includes('امتحان')) {
      const examDateMatch = part.match(/امتحان\((.*?)\)/);
      const examTimeMatch = part.match(/ساعت\s*:\s*([\d:]+)-([\d:]+)/);

      if (examDateMatch) {
        const rawDate = examDateMatch[1].trim();
        examInfo.date = rawDate.includes('_') ? rawDate.split('_')[1].trim() : rawDate;
      }
      if (examTimeMatch) {
        examInfo.start_time = examTimeMatch[1].trim();
        examInfo.end_time = examTimeMatch[2].trim();
      }
    } else {
      const isExercise = part.includes('حل تمرین') || part.includes('(ح)');

      const cleanPartForDay = part.replace(/ /g, '').replace(/\u200c/g, '').replace(/\u200f/g, '');

      let dayFound = null;
      for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
        if (cleanPartForDay.includes(dayName)) {
          dayFound = dayNum;
          break;
        }
      }

      const timeMatch = part.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);

      if (dayFound !== null && timeMatch) {
        let [, startStr, endStr] = timeMatch;
        if (startStr.split(':')[0].length === 1) startStr = `0${startStr}`;
        if (endStr.split(':')[0].length === 1) endStr = `0${endStr}`;

        timesList.push({
          day: dayFound,
          start: startStr,
          end: endStr,
          isExerciseSolving: isExercise,
        });
      }
    }
  }

  return { timesList, examInfo };
};

/**
 * تبدیل حروف عربی (ي و ك) به حروف استاندارد فارسی (ی و ک)
 */
export const normalizeFaText = (text) => {
  if (!text) return '';
  return String(text).replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
};
