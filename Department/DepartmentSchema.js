import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  dept_id: { type: Number, required: true, unique: true },
  dept_name: { type: String, required: true },
});

const Department = mongoose.model('Department', DepartmentSchema);

export default Department;
