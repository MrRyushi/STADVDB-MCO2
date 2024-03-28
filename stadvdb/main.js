document.addEventListener("DOMContentLoaded", function() {
    const insertForm = document.querySelector("#insertForm");
    const searchForm = document.querySelector("#searchForm"); // Add this line

    insertForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(insertForm);
        const jsonData = convertFormDataToJson(formData);
        postData('/insertAppt', jsonData)
            .then(data => {
                console.log(data);
                alert('Data inserted successfully!');
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    });

    searchForm.addEventListener('submit', (event) => { // Add this block
        event.preventDefault();
        const formData = new FormData(searchForm);
        const jsonData = convertFormDataToJson(formData);
        postData('/searchAppt', jsonData)
            .then(data => {
                console.log(data);
                displaySearchResults(data); // Define this function to display search results
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    });

    function convertFormDataToJson(formData) {
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });
        return jsonData;
    }

    function postData(url, jsonData) {
        return fetch(url, {
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
        });
    }
});
