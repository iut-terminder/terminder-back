import express from 'express';
import cors from 'cors';
import UserAPI from './Users/User.js';
import RefreshTokenAPI from './tokens/tokens.js';
import DepartmentAPI from './Department/Department.js';
import InstructorAPI from './Instructor/Instructor.js';
import LessonAPI from './Lessons/Lesson.js';
import ScheduleAPI from './Schedules/Schedule.js';
import CommentAPI from './Comment/Comment.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', UserAPI);
app.use('/api/refreshtoken', RefreshTokenAPI);
app.use('/api/department', DepartmentAPI);
app.use('/api/instructors', InstructorAPI);
app.use('/api/lessons', LessonAPI);
app.use('/api/schedules', ScheduleAPI);
app.use('/api/comments', CommentAPI);

export default app;
