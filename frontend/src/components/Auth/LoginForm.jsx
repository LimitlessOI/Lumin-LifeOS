```jsx
import React from 'react';
import { useForm } from 'react-hook-form';

const LoginForm = ({ onLogin }) => {
    const { register, handleSubmit, errors } = useForm();

    const onSubmit = (data) => {
        onLogin(data);
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
                <input name="password" type="password" ref={register({ required: true })} />
                {errors.password && <span>This field is required</span>}
            </div>
            <button type="submit">Login</button>
        </form>
    );
};

export default LoginForm;
```