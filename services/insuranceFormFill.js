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

export { mapInsuranceFormFill, mapInsuranceFormFields };
