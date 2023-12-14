import Express from 'express';
import UsersAPI from './Users/User.js';
import DepartmentAPI from './Department/Department.js';
import LessonAPI from './Lessons/Lesson.js';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = Express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
app.use(Express.json());

app.use('/api/users', UsersAPI);
app.use('/api/lessons', LessonAPI);
app.use('/api/departments', DepartmentAPI);

export default app;
