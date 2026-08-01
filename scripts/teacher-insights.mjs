/**
 * SYNOPSIS: Summarizes insights from teacher interviews about student-facing platforms.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */

/**
 * Summarizes insights from teacher interviews.
 * @param {object} deps - Injected dependencies.
 * @param {import('pg').Pool} deps.pool - Node-postgres Pool.
 * @param {function(string, string, object?): Promise<string>} deps.callCouncilMember - AI hook to call a council member.
 * @param {import('pino').Logger} deps.logger - Structured logger.
 * @returns {Promise<string>} A summarized report of teacher interview insights.
 */
export async function summarizeTeacherInterviews(deps) {
  deps.logger.info("Starting summary of teacher interviews.");

  // Fetch all teacher interviews from the music_teachers table, using 'notes' for interview content.
  // This assumes 'notes' column in 'music_teachers' is used to store interview details.
  // The task specifies "teacher interviews" but only 'music_teachers' has an 'interview_date' and 'notes' column.
  const query = `
    SELECT
      id,
      name,
      instrument,
      experience_years,
      interview_date,
      notes,
      studio_name
    FROM
      music_teachers
    WHERE
      notes IS NOT NULL AND notes != ''
    ORDER BY
      interview_date DESC
    LIMIT 5;
  `;

  let result;
  try {
    result = await deps.pool.query(query);
  } catch (error) {
    deps.logger.error({ error, query }, "Failed to query music_teachers for interviews.");
    throw new Error("Database query failed for teacher interviews.");
  }

  const interviews = result.rows;

  if (interviews.length === 0) {
    deps.logger.warn("No teacher interviews found in music_teachers table.");
    return "No teacher interviews found to summarize.";
  }

  const interviewTexts = interviews.map(interview => {
    return `Interview ID: ${interview.id}\nTeacher Name: ${interview.name}\nInstrument: ${interview.instrument}\nExperience: ${interview.experience_years} years\nNotes: ${interview.notes}`;
  }).join('\n\n---\n\n');

  const prompt = `
    You are an expert analyst summarizing feedback from teacher interviews about student-facing platforms.
    Analyze the following interview notes and compile a concise summary of key insights, recurring themes,
    and notable suggestions regarding student engagement, learning effectiveness, and platform usability.
    Focus on what works well, what challenges were identified, and any explicit or implicit feature requests.

    Here are the interview notes:

    ${interviewTexts}

    Please provide a summary report.
  `;

  deps.logger.info("Calling Council Member to summarize teacher interviews.");
  try {
    const summary = await deps.callCouncilMember("analyst", prompt, { temperature: 0.7 });
    deps.logger.info("Successfully summarized teacher interviews.");
    return summary;
  } catch (error) {
    deps.logger.error({ error }, "Failed to get summary from Council Member.");
    throw new Error("AI summarization failed.");
  }
}