import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 5000 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

const Comment = mongoose.model('Comment', CommentSchema);

export default Comment;
