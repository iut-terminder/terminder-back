import mongoose from 'mongoose';

const RankEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  hour: { type: Number, required: true, min: 8, max: 13 },
  minute: { type: Number, required: true, min: 0, max: 59 },
  total_minutes: { type: Number, required: true },

  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
  entry_year: { type: Number, required: true, enum: [400, 401, 402, 403, 404] },
}, { timestamps: true });

RankEntrySchema.pre('validate', function (next) {
  this.total_minutes = this.hour * 60 + this.minute;
  const MIN = 8 * 60;      // 08:00
  const MAX = 13 * 60;     // 13:00
  if (this.total_minutes < MIN || this.total_minutes > MAX) {
    return next(new Error('ساعت انتخابی باید بین 08:00 تا 13:00 باشد'));
  }
  next();
});

const RankEntry = mongoose.model('RankEntry', RankEntrySchema);

export default RankEntry;
