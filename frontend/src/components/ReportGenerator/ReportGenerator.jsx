```javascript
import React from 'react';
import { useGenerateReport, useReportTemplates } from '../../hooks/useReportGeneration';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ReportGenerator.css';

const ReportGenerator = () => {
    const { data: templates, isLoading: isTemplatesLoading } = useReportTemplates();
    const { mutate: generateReport, isLoading: isGenerating } = useGenerateReport();

    const handleGenerateReport = (templateId) => {
        generateReport(templateId, {
            onSuccess: () => toast.success('Report generation started!'),
            onError: () => toast.error('Failed to start report generation'),
        });
    };

    if (isTemplatesLoading) return <div>Loading templates...</div>;

    return (
        <div className="report-generator">
            <h2>Generate a Market Report</h2>
            <ul>
                {templates.map((template) => (
                    <li key={template.id}>
                        <button
                            onClick={() => handleGenerateReport(template.id)}
                            disabled={isGenerating}
                        >
                            Generate {template.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ReportGenerator;
```