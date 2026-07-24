import mongoose from 'mongoose';

const InstructorSchema = new mongoose.Schema({
  instructor_name: { type: String, required: true, unique: true },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
});

const Instructor = mongoose.model('Instructor', InstructorSchema);

export default Instructor;
