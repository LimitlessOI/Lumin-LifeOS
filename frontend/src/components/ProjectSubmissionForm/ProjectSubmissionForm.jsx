import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import validationSchema from './validationSchema';
import useCodeReviewSubmit from '../../hooks/useCodeReviewSubmit';

const ProjectSubmissionForm = () => {
    const { submitReview } = useCodeReviewSubmit();

    return (
        <Formik
            initialValues={{ repositoryUrl: '' }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
                await submitReview(values.repositoryUrl);
                setSubmitting(false);
            }}
        >
            {({ isSubmitting }) => (
                <Form>
                    <div>
                        <Field type="text" name="repositoryUrl" placeholder="Repository URL" />
                        <ErrorMessage name="repositoryUrl" component="div" />
                    </div>
                    <button type="submit" disabled={isSubmitting}>
                        Submit for Review
                    </button>
                </Form>
            )}
        </Formik>
    );
};

export default ProjectSubmissionForm;