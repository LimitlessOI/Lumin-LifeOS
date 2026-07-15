/**
 * SYNOPSIS: Service module — FerpaTemplate.
 */
const draftFERPATemplate = () => {
  return `
    FERPA Data Processing Agreement

    This Data Processing Agreement ("Agreement") is entered into by and between the Educational Institution ("Institution") and the Data Processor ("Processor").

    1. Purpose
    The purpose of this Agreement is to ensure that the Processor processes data in compliance with the Family Educational Rights and Privacy Act ("FERPA") and all applicable laws and regulations.

    2. Definitions
    a. "Student Data" means any data, metadata, or information that is directly related to a student and maintained by the Institution or acquired by the Processor in the course of providing its services.
    b. "Processing" means any operation performed on Student Data, such as collection, recording, organization, structuring, storage, alteration, retrieval, consultation, use, disclosure, dissemination, or destruction.

    3. Obligations of the Processor
    a. The Processor shall process Student Data only for the purposes of fulfilling its obligations under this Agreement and in compliance with the Institution's instructions.
    b. The Processor shall implement appropriate technical and organizational measures to protect Student Data against unauthorized access, alteration, disclosure, or destruction.

    4. Confidentiality
    The Processor shall ensure that any person it authorizes to process Student Data is subject to a duty of confidentiality.

    5. Data Subject Rights
    The Processor shall assist the Institution in responding to requests from students or their parents/guardians exercising their rights under FERPA.

    6. Data Breach
    The Processor shall promptly notify the Institution of any breach of Student Data and cooperate with the Institution in addressing the breach.

    7. Termination
    Upon termination of the Agreement, the Processor shall return or destroy all Student Data in its possession, as directed by the Institution.

    8. Governing Law
    This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which the Institution is located.

    IN WITNESS WHEREOF, the parties have executed this Agreement as of the date set forth below.

    Educational Institution: ___________________________
    Data Processor: ___________________________
    Date: ___________________________
  `;
};

export { draftFERPATemplate };