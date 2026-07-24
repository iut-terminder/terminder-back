import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  lesson_id: { type: String, required: true, unique: true },
  lesson_name: { type: String, required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  credit: { type: Number, required: true },
  active_credit: { type: Number, required: true },
  capacity: { type: Number, default: null },
  gender: { type: Number, enum: [0, 1, 2], default: 0 }, // 0=مختلط، 1=مرد، 2=زن
  instructors_list: { type: [String], default: [] },
  times: [
    {
      day: { type: Number, required: true, enum: [0, 1, 2, 3, 4, 5, 6] },
      start: { type: String, required: true },
      end: { type: String, required: true },
      isExerciseSolving: { type: Boolean, default: false },
    },
  ],
  exam_time: {
    date: { type: String, default: '' },
    start_time: { type: String, default: '' },
    end_time: { type: String, default: '' },
  },
  description: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

const Lesson = mongoose.model('Lesson', LessonSchema);

export default Lesson;
