/**
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports summarizeTeacherInterviews and generateTeacherInterviewSummary — scripts/teacher-insights.mjs.
 */
import fs from 'fs/promises';

export async function summarizeTeacherInterviews() {
  try {
    const data = await fs.readFile('interviews/teacher_interviews.json', 'utf-8');
    const interviews = JSON.parse(data);

    const summary = interviews.reduce((acc, interview) => {
      const { insights } = interview;
      insights.forEach(insight => {
        if (!acc[insight]) {
          acc[insight] = 1;
        } else {
          acc[insight]++;
        }
      });
      return acc;
    }, {});

    return summary;
  } catch (error) {
    console.error('Error reading or parsing interviews:', error);
    throw error;
  }
}

export async function generateTeacherInterviewSummary() {
  try {
    const summary = await summarizeTeacherInterviews();
    console.log('Teacher Interviews Summary:', summary);
  } catch (error) {
    console.error('Failed to generate teacher interview summary:', error);
  }
}
