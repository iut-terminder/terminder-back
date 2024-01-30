import express from 'express';
import Lesson from './LessonSchema.js';
import xlsx from 'xlsx';
import multer from 'multer';
import * as fs from 'fs';
import { writeLesson } from './functions.js';
import jwt from 'jsonwebtoken';

const LessonAPI = express.Router();
const upload = multer({ dest: 'uploads/' });

LessonAPI.post('/upload', upload.single('file'), async (req, res) => {
  const { accesstoken } = req.headers;

  try {
    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );

    if (!result.isAdmin) {
      res.status(406).send({ status: 'permission denied.' });
      return;
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { department, shouldSave } = req.body;

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(1);

    fs.unlink(filePath, err => {
      if (err) throw err;
    });

    res.json(await writeLesson(data, department, shouldSave == 'true'));
  } catch (error) {
    console.error('Error processing Excel file:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

LessonAPI.post('/add', async (req, res) => {
  const { lesson_code } = req.body;
  const { accesstoken } = req.headers;

  try {
    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );

    if (!result.isAdmin) {
      res.status(406).send({ status: 'permission denied.' });
      return;
    }

    let lesson = await Lesson.findOne({ lesson_code: lesson_code.trim() });

    if (lesson) {
      res.status(406).send({ status: 'Repeated lesson code.' });
      return;
    }

    lesson = new Lesson({ ...req.body });

    await lesson.save();
    res.status(200).send({ status: 'Lesson added succusfully' });
  } catch (err) {
    res.status(406).send({ error: err.message });
  }
});

LessonAPI.get('/all', async (req, res) => {
  const { accesstoken } = req.headers;

  try {
    jwt.verify(accesstoken, process.env.AUTH_ACCESS_TOKEN_SECRET);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }

  const lessens = await Lesson.find();
  lessens.sort((a, b) => a.Name.localeCompare(b.Name, 'fa'));
  res.status(200).send(lessens);
});

export default LessonAPI;
