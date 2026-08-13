import express from 'express';
import Field from './FieldSchema.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';

const FieldAPI = express.Router();

// افزودن رشته — فقط ادمین
FieldAPI.post('/', requireAuth, requireStaff, async (req, res) => {
  const { field_id, field_name } = req.body;

  try {
    if (field_id === undefined || !field_name) {
      return res.status(400).json({ error: 'شناسه و نام رشته الزامی است' });
    }

    const existing = await Field.findOne({ $or: [{ field_id }, { field_name: field_name.trim() }] });
    if (existing) {
      return res.status(400).json({ error: 'این رشته قبلاً ثبت شده است' });
    }

    const field = new Field({ field_id, field_name: field_name.trim() });
    await field.save();

    return res.status(201).json(field);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

FieldAPI.get('/', async (req, res) => {
  try {
    const fields = await Field.find().sort({ field_name: 1 });
    return res.status(200).json(fields);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default FieldAPI;
