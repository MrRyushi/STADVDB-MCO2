document.addEventListener("DOMContentLoaded", function() {
    const insertForm = document.querySelector("#insertForm");
    insertForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(insertForm);
        
        /// Convert formData to JSON
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });

        // Make a POST request to the backend
        fetch('/insertAppt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            // Handle the response from the backend
            console.log(data);
            alert('Data inserted successfully!');
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    });
})