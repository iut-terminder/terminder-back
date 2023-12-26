import mongoose from 'mongoose';

const RefreshTokenShcema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  token: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date(),
    index: { expires: process.env.AUTH_REFRESH_TOKEN_EXPIRY },
  },
});

RefreshTokenShcema.index({ createdAt: 1 });
const RefreshToken = mongoose.model('RefreshToken', RefreshTokenShcema);

export default RefreshToken;
