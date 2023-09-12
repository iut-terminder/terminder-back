import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './database.js';

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
})();
