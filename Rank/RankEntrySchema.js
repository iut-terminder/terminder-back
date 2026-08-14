import mongoose from 'mongoose';

// هر کاربر فقط یک‌بار می‌تواند ساعت، رشته و ورودی خود را ثبت کند.
// رشته کاملاً مستقل از دانشکده است (ارتباطی بین این دو وجود ندارد).
const RankEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // ساعت به‌صورت hour (8 تا 13) و minute (0 تا 59) ذخیره می‌شود تا اعتبارسنجی
  // بازه‌ی 8:00 تا 13:00 ساده و دقیق باشد. total_minutes برای مرتب‌سازی و
  // محاسبه‌ی سریع رتبه از نیمه‌شب محاسبه و کش می‌شود.
  hour: { type: Number, required: true, min: 8, max: 13 },
  minute: { type: Number, required: true, min: 0, max: 59 },
  total_minutes: { type: Number, required: true },

  field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },

  // ورودی؛ فقط مقادیر مجاز 400 تا 404
  entry_year: { type: Number, required: true, enum: [400, 401, 402, 403, 404] },
}, { timestamps: true });

// ساعت 13:00 دقیقاً مجاز است اما 13:01 به بعد نه؛ این را در سطح schema با
// یک validate سفارشی روی total_minutes پوشش می‌دهیم (8:00 تا 13:00 شامل هر دو سر).
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
