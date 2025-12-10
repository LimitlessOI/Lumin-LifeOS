```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContentGeneration } from '../hooks/useContentGeneration';
import { contentRequestSchema } from '../utils/contentValidators';
import './ContentRequestForm.css';

export const ContentRequestForm = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(contentRequestSchema)
    });

    const { generateContent, templates, loading, error } = useContentGeneration();

    const onSubmit = (data) => {
        generateContent(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="content-request-form">
            <select {...register('templateId')}>
                {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                ))}
            </select>
            <textarea {...register('requestData')} placeholder="Enter your request data" />
            {errors.requestData && <span>{errors.requestData.message}</span>}
            <button type="submit" disabled={loading}>Generate Content</button>
            {error && <span className="error">{error}</span>}
        </form>
    );
};