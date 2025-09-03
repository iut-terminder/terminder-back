import moment from 'moment-jalaali';
import Lesson from './LessonSchema.js';
import Department from '../Department/DepartmentSchema.js';

const determineGender = str => {
  switch (str) {
    case 'مختلط':
      return 'both';

    case 'مرد':
      return 'boy';

    case 'زن':
      return 'girl';

    default:
      return 'null';
  }
};

const determineDay = str => {
  switch (str[0]) {
    case 'ش':
      return 0;

    case 'ي':
      return 1;

    case 'د':
      return 2;

    case 'س':
      return 3;

    case 'چ':
      return 4;

    case 'پ':
      return 5;

    default:
      return -1;
  }
};

const timeDecomposition = str => {
  let times = str.split('-');

  let start = parseInt(times[0].replace(':', ''));
  start = start % 100 == 30 ? start + 20 : start;
  let end = parseInt(times[1].replace(':', ''));
  end = end % 100 == 30 ? end + 20 : end;

  return { start: start, end: end };
};

const timesDivision = arr => {
  const result = {
    times: [],
    location: '',
    exam_date: { day: -1, date: '0', start: -1, end: -1 },
  };

  for (const item of arr) {
    if (item == null) continue;

    // --- امتحان

    if (item.includes('امتحان')) {
      const examRegex = /امتحان\((\d+)_(\d{4}\.\d{2}\.\d{2})\)\s*ساعت\s*:\s*(\d{2}:\d{2})-(\d{2}:\d{2})/;
      const examMatch = item.match(examRegex);

      if (examMatch) {
        const [, examNumber, rawDate, startStr, endStr] = examMatch;
        const { start, end } = timeDecomposition(`${startStr}-${endStr}`);

        const date = rawDate.replace(/\./g, "/");
        const jDate = moment(date, 'jYYYY/jMM/jDD');
        const dayOfWeek = (jDate.day() + 1) % 7;

        result.exam_date = {
          start,
          end,
          date,
          day: dayOfWeek,
          examNumber: parseInt(examNumber),
        };
      }
    }

    // --- کلاس یا حل تمرین
    // داخل timesDivision
    const classRegex = /(درس|حل تمرين)\([\u0600-\u06FF]\):\s*([\u0600-\u06FF\s]+?)\s+(\d{2}:\d{2})-(\d{2}:\d{2})(?:\s+مکان:\s*([\u0600-\u06FF0-9A-Za-z]+))?/g;
    let match;
    while ((match = classRegex.exec(item)) !== null) {
      const [, type, dayStr, startStr, endStr, location] = match;

      const { start, end } = timeDecomposition(`${startStr}-${endStr}`);

      let record = {
        day: determineDay(dayStr.trim()),
        start,
        end,
        isExerciseSolving: type === 'حل تمرين',
      };

      result.times.push(record);
      result.location = location;
    }
  }
  return result;
};

export const writeLesson = async (data, department, shouldSave) => {
  const retObj = {
    changePerformed: shouldSave,
    tot: 0,
    repeated: 0,
    new: 0,
    updated: 0,
    withoutTime: 0,
  };
  const arrayResult = [];

  while (data.length > 0) {
    let lesson = data.shift();

    if (lesson[11] == undefined) {
      retObj.withoutTime++;
      continue;
    }


    const arr = [lesson[11]];
    let record = new Lesson({
      Name: lesson[1],
      lesson_code: lesson[0].slice(0, -3),
      group_code: lesson[0].slice(-2),
      numbers: parseInt(lesson[2]),
      capacity: parseInt(lesson[4]),
      teacher: lesson[8],
      department: department,
      gender: determineGender(lesson[7]),
      detail: lesson[12] ? lesson[12] : '',
    });

    const temp = timesDivision(arr);

    record.times = temp.times;
    record.exam_date = temp.exam_date;
    record.location = temp.location;

    record = await checkExistRecord(record, shouldSave);
    arrayResult.push(record);

    if (record.type == 'new') retObj.new++;
    if (record.type == 'updated') retObj.updated++;
    if (record.type == 'repeated') retObj.repeated++;
  }

  retObj.tot = retObj.new + retObj.updated + retObj.repeated;
  return { status: retObj, records: arrayResult };
};

async function checkExistRecord(record, isSave = true) {
  let res = await Lesson.findOne({
    lesson_code: record.lesson_code,
    group_code: record.group_code,
  });

  let dept = await Department.findOne({ _id: record.department });

  if (!res) {
    if (isSave) await record.save();
    record = record.toObject();
    record.department = dept.title;
    return { type: 'new', record: record };
  }

  let sameRecord = true;

  if (res.Name != record.Name) {
    res.Name = record.Name;
    sameRecord = false;
  }

  if (!areObjectsEqual(res.exam_date, record.exam_date)) {
    res.exam_date = record.exam_date;
    sameRecord = false;
  }

  if (res.location != record.location) {
    res.location = record.location;
    sameRecord = false;
  }

  if (res.capacity != record.capacity) {
    res.capacity = record.capacity;
    sameRecord = false;
  }

  if (res.gender != record.gender) {
    res.gender = record.gender;
    sameRecord = false;
  }

  if (res.teacher != record.teacher) {
    res.teacher = record.teacher;
    sameRecord = false;
  }

  if (!res.department.equals(record.department)) {
    res.department = record.department;
    sameRecord = false;
  }

  if (res.detail != record.detail) {
    res.detail = record.detail;
    sameRecord = false;
  }

  if (res.times.length != record.times.length) {
    res.times = record.times;
    sameRecord = false;
  } else {
    for (let i = 0; i < res.times.length; i++) {
      if (
        res.times[i].day != record.times[i].day ||
        res.times[i].start != record.times[i].start ||
        res.times[i].end != record.times[i].end ||
        res.times[i].isExerciseSolving != record.times[i].isExerciseSolving
      ) {
        res.times = record.times;
        sameRecord = false;
        break;
      }
    }
  }

  if (sameRecord) {
    record = record.toObject();
    record.department = dept.title;
    return { type: 'repeated', record: record };
  } else {
    if (isSave) await res.save();
    res = res.toObject();
    res.department = dept.title;
    return { type: 'updated', record: res };
  }
}

function areObjectsEqual(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}
