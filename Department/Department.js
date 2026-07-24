import express from 'express';
import Department from './DepartmentSchema.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';

const DepartmentAPI = express.Router();

// افزودن دپارتمان — فقط ادمین
DepartmentAPI.post('/', requireAuth, requireStaff, async (req, res) => {
  const { dept_id, dept_name } = req.body;

  try {
    if (dept_id === undefined || !dept_name) {
      return res.status(400).json({ error: 'شناسه و نام دانشکده الزامی است' });
    }

    const existing = await Department.findOne({ $or: [{ dept_id }, { dept_name: dept_name.trim() }] });
    if (existing) {
      return res.status(400).json({ error: 'این دانشکده قبلاً ثبت شده است' });
    }

    const department = new Department({ dept_id, dept_name: dept_name.trim() });
    await department.save();

    return res.status(201).json(department);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

DepartmentAPI.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ dept_name: 1 });
    return res.status(200).json(departments);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default DepartmentAPI;
