import nodemailer from 'nodemailer';

const getTransporter = () => {
  if (!process.env.AUTH_EMAIL_USERNAME || !process.env.AUTH_EMAIL_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.AUTH_EMAIL_USERNAME,
      pass: process.env.AUTH_EMAIL_PASSWORD,
    },
  });
};

export const sendMail = async (toAddress, subject, textBody) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('--- ایمیل (حالت کنسول، SMTP تنظیم نشده) ---');
    console.log('به:', toAddress);
    console.log('موضوع:', subject);
    console.log('متن:', textBody);
    console.log('-------------------------------------------');
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.AUTH_EMAIL_USERNAME,
      to: toAddress,
      subject,
      text: textBody,
    });
    return true;
  } catch (err) {
    console.error('خطا در ارسال ایمیل:', err.message);
    throw err;
  }
};

export const sendActivationEmail = async (toAddress, activationLink) => {
  const subject = 'تایید حساب کاربری - سامانه دانشگاه';
  const body = `،با سلام\n:لطفاً برای فعال‌سازی حساب کاربری خود روی لینک زیر کلیک کنید\n\n${activationLink}`;
  return sendMail(toAddress, subject, body);
};

export const sendPasswordResetEmail = async (toAddress, resetLink) => {
  const subject = 'بازنشانی رمز عبور - سامانه دانشگاه';
  const body = `،با سلام\n:برای بازنشانی رمز عبور حساب کاربری خود روی لینک زیر کلیک کنید\n\n${resetLink}\n\nاگر این درخواست را شما نداده‌اید، این پیام را نادیده بگیرید.`;
  return sendMail(toAddress, subject, body);
};
