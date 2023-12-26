import Express from 'express';
import UserAPI from './Users/User.js';
import DepartmentAPI from './Department/Department.js';
import LessonAPI from './Lessons/Lesson.js';
import RefreshTokenAPI from './tokens/tokens.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';

const app = Express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
app.use(Express.json());
app.set('views', path.join('templete', 'views'));
app.set('view engine', 'ejs');

app.use('/api/users', UserAPI);
app.use('/api/lessons', LessonAPI);
app.use('/api/departments', DepartmentAPI);
app.use('/api/refreshtoken', RefreshTokenAPI);

export default app;
