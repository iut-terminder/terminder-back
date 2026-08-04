import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const ScheduleItemSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  color: { type: String, default: '#248F24' },
}, { _id: false });

const SavedScheduleSchema = new mongoose.Schema({
  title: { type: String, default: 'برنامه من' },
  items: { type: [ScheduleItemSchema], default: [] },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  student_no: { type: String, required: true, unique: true },
  first_name: { type: String, required: false },
  last_name: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: null },
  password_hash: { type: String, required: true },
  is_active: { type: Boolean, default: false },
  is_staff: { type: Boolean, default: false },
  schedules: { type: [SavedScheduleSchema], default: [] },
}, { timestamps: true });

UserSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(password, salt);
};

UserSchema.methods.validPassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

const User = mongoose.model('User', UserSchema);

export default User;
