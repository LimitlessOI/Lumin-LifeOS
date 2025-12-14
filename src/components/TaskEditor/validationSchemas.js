```javascript
import * as Yup from 'yup';

export const taskValidationSchema = Yup.object().shape({
    title: Yup.string().required('Title is required').max(255, 'Title is too long'),
    description: Yup.string().nullable(),
    status: Yup.string().required('Status is required')
});
```