/**
 * SYNOPSIS: Service module — MusicTeachers.
 */
const musicTeachers = [];

export const addMusicTeacher = (teacher) => {
  musicTeachers.push(teacher);
  return teacher;
};

export const getMusicTeachers = () => {
  return [...musicTeachers];
};