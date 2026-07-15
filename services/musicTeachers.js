/**
 * SYNOPSIS: Exports addMusicTeacher — services/musicTeachers.js.
 */
const musicTeachers = [];

export function addMusicTeacher(teacher) {
  if (!teacher || !teacher.name || !teacher.instrument) {
    throw new Error('Invalid teacher data');
  }
  musicTeachers.push(teacher);
  return teacher;
}

export function getMusicTeachers() {
  return musicTeachers;
}
