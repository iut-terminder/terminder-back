import mongoose from 'mongoose';

const LessonShcema = new mongoose.Schema({
  Name: { type: String, required: true },
  times: [
    {
      day: { type: String, required: true },
      start: { type: Number, required: true },
      end: { type: Number, required: true },
    },
  ],
});

const Lesson = mongoose.model('Lesson', LessonShcema);

export default Lesson;
