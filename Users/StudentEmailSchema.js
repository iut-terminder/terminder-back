import mongoose from 'mongoose';

const StudentEmailSchema = new mongoose.Schema(
  {
    student_no: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

const StudentEmail = mongoose.model('StudentEmail', StudentEmailSchema);

export default StudentEmail;