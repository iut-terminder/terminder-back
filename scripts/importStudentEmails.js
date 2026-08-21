import XLSX from 'xlsx';
import dotenv from 'dotenv';
import connectDB from '../database.js';
import StudentEmail from '../Users/StudentEmailSchema.js';

dotenv.config();

const EXCEL_FILE = './students_list.xlsx';

const importStudentEmails = async () => {
  try {
    await connectDB();

    const workbook = XLSX.readFile(EXCEL_FILE);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`تعداد ردیف‌های Excel: ${rows.length}`);

    const students = rows.map((row, index) => {
      const student_no = String(
        row['شماره دانشجویی'] ?? ''
      ).trim();

      const email = String(
        row['ایمیل'] ?? ''
      ).trim().toLowerCase();

      if (!student_no) {
        throw new Error(
          `شماره دانشجویی در ردیف ${index + 2} وجود ندارد`
        );
      }

      if (!email) {
        throw new Error(
          `ایمیل در ردیف ${index + 2} وجود ندارد`
        );
      }

      return {
        student_no,
        email,
      };
    });

    await StudentEmail.deleteMany({});

    await StudentEmail.insertMany(students);

    console.log(
      `${students.length} دانشجو با موفقیت وارد دیتابیس شدند.`
    );

  } catch (error) {
    console.error('خطا در import:', error);
  } finally {
    process.exit();
  }
};

importStudentEmails();