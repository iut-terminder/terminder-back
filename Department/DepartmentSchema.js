import mongoose from 'mongoose';

const DepartmentShcema = new mongoose.Schema({
  title: { type: String, required: true },
});

const Department = mongoose.model('Department', DepartmentShcema);

export default Department;
