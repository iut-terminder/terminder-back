import express from 'express';
import Department from './DepartmentSchema.js';
import jwt from 'jsonwebtoken';

const DepartmentAPI = express.Router();

DepartmentAPI.post('/add', async (req, res) => {
  const { dept_name } = req.body;
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

    let dept = await Department.findOne({ title: dept_name });

    if (dept) {
      res.status(406).send({ status: 'Repeated department' });
      return;
    }

    dept = new Department({ title: dept_name.trim() });
    await dept.save();
    res.status(200).send({ status: 'Department added succesfully' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

DepartmentAPI.get('/all', async (req, res) => {
  const { accesstoken } = req.headers;

  try {
    jwt.verify(accesstoken, process.env.AUTH_ACCESS_TOKEN_SECRET);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }

  const dept = await Department.find();

  if (!dept) {
    res.status(404).send({ status: 'no department exist' });
    return;
  }

  res.status(200).send(dept);
});

export default DepartmentAPI;
