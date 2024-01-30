import mongoose from 'mongoose';
import Department from '../Department/DepartmentSchema.js';

const LessonShcema = new mongoose.Schema({
  Name: { type: String, required: true },
  exam_date: {
    day: { type: Number, default: -1, enum: [-1, 0, 1, 2, 3, 4, 5, 6] },
    date: { type: String, default: '' },
    start: { type: Number, default: -1 },
    end: { type: Number, default: -1 },
  },
  lesson_code: { type: String, required: true, unique: true},
  group_code: { type: String, required: true },
  location: { type: String, default: '' },
  capacity: { type: Number, default: 0 },
  gender: {
    type: String,
    required: true,
    enum: ['girl', 'boy', 'both', 'null'],
  },
  numbers: { type: Number, default: 0 },
  teacher: { type: String, required: true },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    require: true,
  },
  detail: { type: String, default: '' },

  times: [
    {
      day: { type: Number, required: true, enum: [0, 1, 2, 3, 4, 5, 6] },
      start: { type: Number, required: true },
      end: { type: Number, required: true },
      isExerciseSolving: { type: Boolean, required: true },
    },
  ],
});

const Lesson = mongoose.model('Lesson', LessonShcema);

export default Lesson;
