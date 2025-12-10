```jsx
import React from 'react';
import { useForm } from 'react-hook-form';

const RegisterForm = ({ onRegister }) => {
    const { register, handleSubmit, errors } = useForm();

    const onSubmit = (data) => {
        onRegister(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label>Email</label>
                <input name="email" ref={register({ required: true })} />
                {errors.email && <span>This field is required</span>}
            </div>
            <div>
                <label>Password</label>
                <input name="password" type="password" ref={register({ required: true, minLength: 6 })} />
                {errors.password && <span>This field is required and must be at least 6 characters</span>}
            </div>
            <button type="submit">Register</button>
        </form>
    );
};

export default RegisterForm;
```