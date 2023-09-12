import express from 'express';
import Lesson from './LessonSchema.js';

const LessonAPI = express.Router();

LessonAPI.post('/add', async (req, res) => {
  const { Name, time } = req.body;

  try {
    let lesson = await Lesson.findOne({ Name: Name.trim() });

    if (!lesson) {
      lesson = new Lesson({ Name: Name.trim(), times: [] });
      await lesson.save();
    }

    lesson.times.push(time);
    await lesson.save();

    res.status(200).send({ status: 'Lesson added succusfully' });
  } catch (err) {
    res.status(406).send({ error: err.message });
  }
});

LessonAPI.get('/all', async (req, res) => {
  const lessens = await Lesson.find();
  res.status(200).send(lessens);
});

export default LessonAPI;
