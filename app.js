import Express from 'express';
import UsersAPI from './Users/User.js';
import LessonAPI from './Lessons/Lesson.js';

const app = Express();

app.use(Express.json());

app.use('/users', UsersAPI);
app.use('/lessons', LessonAPI);

export default app;
