export interface Course {
  id:           string;
  code:         string;
  title:        string;
  units:        number;
  departmentId: string;
  department?:  { name: string };
  createdAt:    Date;
}

export interface CourseRegistration {
  id:       string;
  courseId: string;
  userId:   string;
  session:  string;
  semester: number;
  course?:  Course;
}