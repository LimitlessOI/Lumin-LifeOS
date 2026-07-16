/**
 * SYNOPSIS: Service module — InsuranceFormFill.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
function mapInsuranceFormFill(lifeosUser, insuranceProfile) {
    const mappedData = {
        memberId: lifeosUser.memberId,
        groupNumber: insuranceProfile.groupNumber,
        dateOfBirth: lifeosUser.dob,
        name: lifeosUser.name
    };
    return mappedData;
}

function mapInsuranceFormFields(lifeosUser, insuranceProfile) {
    const mappedFields = {
        memberId: lifeosUser.memberId,
        groupNumber: insuranceProfile.groupNumber,
        dateOfBirth: lifeosUser.dob,
        name: lifeosUser.name
    };
    return mappedFields;
}

/**
 * Fill the insurance form using the provided user and profile data.
 * @param {Object} lifeosUser - The user data from lifeos_users table.
 * @param {Object} insuranceProfile - The profile data from insurance_profiles table.
 * @returns {Object} - The filled insurance form data.
 */
function fillInsuranceForm(lifeosUser, insuranceProfile) {
    const filledForm = mapInsuranceFormFill(lifeosUser, insuranceProfile);
    // Additional form filling logic can be added here if needed.
    return filledForm;
}

export { mapInsuranceFormFill, mapInsuranceFormFields, fillInsuranceForm };
