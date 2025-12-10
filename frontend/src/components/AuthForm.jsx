```javascript
import React from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';

const AuthForm = ({ onSubmit, initialValues, validationSchema, buttonText }) => {
  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit,
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div>
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formik.values.email}
          onChange={formik.handleChange}
        />
        {formik.errors.email && <div>{formik.errors.email}</div>}
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formik.values.password}
          onChange={formik.handleChange}
        />
        {formik.errors.password && <div>{formik.errors.password}</div>}
      </div>
      <button type="submit">{buttonText}</button>
    </form>
  );
};

export default AuthForm;
```