/**
 * SYNOPSIS: Usage example
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */
import fs from 'fs';
import path from 'path';

export function summarizeInterviews() {
    const interviews = [
        { type: 'homeschool', insights: 'Flexibility and personalized learning are key benefits.' },
        { type: 'traditional', insights: 'Structure and socialization are important factors.' },
        { type: 'homeschool', insights: 'Concerns about lack of social interaction.' },
        { type: 'traditional', insights: 'Appreciate the resources and extracurricular activities.' },
        { type: 'homeschool', insights: 'Ability to tailor curriculum to child’s needs.' },
        { type: 'traditional', insights: 'Value in certified teachers and standardized testing.' },
        { type: 'homeschool', insights: 'Challenges in balancing teaching and parenting roles.' },
        { type: 'traditional', insights: 'Transportation and scheduling issues.' },
        { type: 'homeschool', insights: 'Strong community support and co-op opportunities.' },
        { type: 'traditional', insights: 'Diverse peer group exposure.' }
    ];

    const summary = interviews.reduce((acc, interview) => {
        if (!acc[interview.type]) {
            acc[interview.type] = [];
        }
        acc[interview.type].push(interview.insights);
        return acc;
    }, {});

    return summary;
}

export function saveSummaryToFile(filename, summary) {
    const filePath = path.resolve(process.cwd(), filename);
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
}

export function generateParentInterviewSummary() {
    const summary = summarizeInterviews();
    console.log('Parent Interview Summary:', summary);
    return summary;
}

// Usage example
const summary = generateParentInterviewSummary();
saveSummaryToFile('interview-summary.json', summary);
