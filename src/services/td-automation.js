// TD Automation Service

export const autofillForm = (data) => {
    if (data.propertyAddress) {
        document.querySelector('input[name="propertyAddress"]').value = data.propertyAddress;
    }
    if (data.transactionDate) {
        document.querySelector('input[name="transactionDate"]').value = data.transactionDate;
    }
    // More autofill logic as needed
};

export const uploadDocument = (file) => {
    const reader = new FileReader();
    reader.onload = function(e) {
        // Logic to paste the document content into TransactionDesk forms
        console.log(e.target.result); // Example for handling document content
    };
    reader.readAsText(file);
};