document.addEventListener("DOMContentLoaded", function() {
    const insertForm = document.querySelector("#insertForm");
    const searchForm = document.querySelector("#searchForm"); 
    const updateForm = document.querySelector("#updateForm");
    const totalCountAppointments = document.querySelector("#totalAppointments"); 

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

    updateForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(document.querySelector("#updateForm"));
        const jsonData = convertFormDataToJson(formData);
        postData('/updateAppt', jsonData)
            .then(data => {
                console.log(data);
                alert('Appointment updated successfully!');
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    });

    // Text-based reports functions
    // Function to generate the total count of appointments report
    totalCountAppointments.addEventListener('click', generateTotalCountAppointmentsReport);
    function generateTotalCountAppointmentsReport() {
        const selectedRegion = document.querySelector("#totalAppointments").value;
        const url = '/totalCountAppointments' + (selectedRegion !== 'all' ? `?region=${selectedRegion}` : '');

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Display the data in the `#reportsResults` div
                document.querySelector("#reportsResults").innerHTML = `<p>Total Count of Appointments: ${data.totalAppointments}</p>`;
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }

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
