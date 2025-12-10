const Joi = require('joi');

const CourseSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().required(),
  price: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  published: Joi.boolean()
});

class Course {
  constructor(data) {
    const { error } = CourseSchema.validate(data);
    if (error) {
      throw new Error(`Invalid Course data: ${error.message}`);
    }
    Object.assign(this, data);
  }
}

module.exports = Course;