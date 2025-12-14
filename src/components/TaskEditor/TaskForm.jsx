```javascript
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { taskValidationSchema } from './validationSchemas';

const TaskForm = ({ onSubmit }) => {
    const { register, handleSubmit, errors } = useForm({
        resolver: yupResolver(taskValidationSchema)
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label>Title</label>
                <input name="title" ref={register} />
                {errors.title && <p>{errors.title.message}</p>}
            </div>
            <div>
                <label>Description</label>
                <textarea name="description" ref={register} />
            </div>
            <div>
                <label>Status</label>
                <input name="status" ref={register} />
                {errors.status && <p>{errors.status.message}</p>}
            </div>
            <button type="submit">Save Task</button>
        </form>
    );
};

export default TaskForm;
```