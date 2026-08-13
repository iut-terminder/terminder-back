import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
  field_id: { type: Number, required: true, unique: true },
  field_name: { type: String, required: true, unique: true },
});

const Field = mongoose.model('Field', FieldSchema);

export default Field;
