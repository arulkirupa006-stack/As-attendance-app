import { Student } from '../types';

const FIRST_NAMES = [
  'Alexander', 'Amara', 'Benjamin', 'Camila', 'Daniel', 'Elena', 'Felix', 'Grace',
  'Henry', 'Isla', 'Julian', 'Kai', 'Leo', 'Maya', 'Nathan', 'Olivia', 'Penelope',
  'Quinn', 'Ryan', 'Sophia', 'Tristan', 'Uma', 'Victor', 'Willa', 'Xavier', 'Yara',
  'Zachary', 'Aria', 'Caleb', 'Daisy', 'Ethan', 'Fiona', 'Gabriel', 'Hannah', 'Isaac',
  'Jasmine', 'Kevin', 'Lily', 'Mason', 'Nora', 'Oliver', 'Piper', 'Riley', 'Samuel',
  'Tara', 'Veda', 'Wyatt', 'Zoe', 'Aarav', 'Ananya', 'Chen', 'Dmitri', 'Hiroshi',
  'Ji-woo', 'Mateo', 'Nia', 'Santiago', 'Zainab'
];

const LAST_NAMES = [
  'Anderson', 'Bennett', 'Carter', 'Diaz', 'Evans', 'Foster', 'Garcia', 'Hayes',
  'Ibrahim', 'Jackson', 'Kim', 'Lopez', 'Miller', 'Nguyen', "O'Connor", 'Patel',
  'Quispe', 'Rodriguez', 'Sharma', 'Takahashi', 'Umar', 'Vance', 'Watson', 'Xu',
  'Yilmaz', 'Zhang', 'Baker', 'Clark', 'Davis', 'Ellis', 'Fisher', 'Gomez', 'Hill',
  'Jenkins', 'Khan', 'Liu', 'Martinez', 'Nakamura', 'Olsen', 'Park', 'Reyes', 'Smith',
  'Taylor', 'Underwood', 'Vargas', 'White', 'Young', 'Zheng'
];

const GRADES = ['Grade 10-A', 'Grade 10-B', 'Grade 11-A', 'Grade 11-B', 'Grade 12-A'];

const NOTES_OPTIONS = [
  'Robotics Club', 'Debate Captain', 'Honor Roll', 'School Bus Route 4',
  'Basketball Varsity', 'Drama Club', 'Math Olympiad', 'Student Council',
  'Swimming Team', 'Art & Photography', 'Coding Club', 'Science Fair Participant', ''
];

export function generateBulkStudents(count: number = 100, startRoll: number = 101, defaultGrade?: string): Student[] {
  const generated: Student[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    const numStr = (startRoll + i).toString().padStart(3, '0');
    const studentId = `STU-2026-${numStr}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/['\s]/g, '')}${numStr}@school.edu`;
    const phone = `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const grade = defaultGrade && defaultGrade !== 'ALL' ? defaultGrade : GRADES[i % GRADES.length];
    const rollNumber = `${startRoll + i}`;
    const notes = NOTES_OPTIONS[i % NOTES_OPTIONS.length];
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + '-' + (startRoll + i))}`;

    generated.push({
      id: `stu-bulk-${timestamp}-${i + 1}`,
      studentId,
      name,
      email,
      phone,
      grade,
      rollNumber,
      notes: notes || undefined,
      avatar
    });
  }

  return generated;
}
