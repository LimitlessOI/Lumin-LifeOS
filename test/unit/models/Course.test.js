const Course = require('../../../src/models/Course');

describe('Course Model', () => {
  it('should create a course with valid data', () => {
    const data = { title: 'Test Course', description: 'A test course', price: 19.99, currency: 'USD', published: false };
    const course = new Course(data);
    expect(course).toMatchObject(data);
  });

  it('should throw an error with invalid data', () => {
    const data = { title: 'T', price: -10, currency: 'US' };
    expect(() => new Course(data)).toThrow();
  });
});