import express from 'express';
import Instructor from './InstructorSchema.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';

const InstructorAPI = express.Router();

InstructorAPI.post('/', requireAuth, requireStaff, async (req, res) => {
  const { instructor_name, departments } = req.body;

  try {
    if (!instructor_name) {
      return res.status(400).json({ error: 'نام استاد الزامی است' });
    }

    const existing = await Instructor.findOne({ instructor_name: instructor_name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'این استاد قبلاً ثبت شده است' });
    }

    const instructor = new Instructor({
      instructor_name: instructor_name.trim(),
      departments: departments || [],
    });
    await instructor.save();

    return res.status(201).json(instructor);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

InstructorAPI.get('/', async (req, res) => {
  try {
    const instructors = await Instructor.find().populate('departments').sort({ instructor_name: 1 });
    return res.status(200).json(instructors);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default InstructorAPI;
