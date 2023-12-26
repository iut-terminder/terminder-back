import nodemailer from 'nodemailer';
import ejs from 'ejs';
import fs from 'fs';

export const send_email = async (mailAdress, token) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.AUTH_EMAIL_USERNAME,
        pass: process.env.AUTH_EMAIL_PASSWORD,
      },
    });

    const verificationLink = process.env.VERIFY_LINK + token;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: mailAdress,
      subject: `تایید ایمیل برای سایت ${process.env.EMAIL_FROM}`,
      html: ejs.render(fs.readFileSync('template/mail.ejs', 'utf-8'), {
        verificationLink,
      }),
    });
  } catch (err) {
    throw err;
  }
};
