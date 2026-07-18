/**
 * SYNOPSIS: services/accountFormFill.js
 */
// services/accountFormFill.js

export function fillAccountForms(profileData, accountForm) {
    if (!profileData || !accountForm) {
        throw new Error('Profile data and account form are required');
    }

    const filledForm = { ...accountForm };

    if (profileData.name) {
        filledForm.name = profileData.name;
    }
    if (profileData.email) {
        filledForm.email = profileData.email;
    }
    if (profileData.address) {
        filledForm.address = profileData.address;
    }
    if (profileData.phone) {
        filledForm.phone = profileData.phone;
    }

    return filledForm;
}
