document.addEventListener("DOMContentLoaded", function() {
    const insertForm = document.querySelector("#insertForm");
    const searchForm = document.querySelector("#searchForm"); 
    const updateForm = document.querySelector("#updateForm");
    const checkApptidButton = document.getElementById('checkApptid');
    const totalCountAppointments = document.querySelector("#totalAppointments"); 

    // function to fetch url from backend
    function postData(url, jsonData) {
        return fetch(url, { // Construct the full URL including the port
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 400) {
                throw new Error('Appointment ID already exists');
            } else {
                throw new Error('Network response was not ok.');
            }
        });
    }

    // insert appointment form
    insertForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(insertForm);
        const jsonData = convertFormDataToJson(formData);
        postData('http://localhost:3000/insertAppt', jsonData)
            .then(data => {
                console.log(data);
                alert('Data inserted successfully!');
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    });

    // search appointment form
    searchForm.addEventListener('submit', (event) => { 
        event.preventDefault();
        const formData = new FormData(searchForm);
        const jsonData = convertFormDataToJson(formData);
        postData('http://localhost:3000/searchAppt', jsonData)
            .then(data => {
                console.log(data);
                displaySearchResults(data); // Define this function to display search results
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error.message);
            });
    });

    // update appointment form
    updateForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(updateForm);
        const jsonData = convertFormDataToJson(formData);
        fetch('http://localhost:3000/updateAppt', {
            method: 'PUT', // Use PUT method
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Status: ${response.status}, Body: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            alert('Data updated successfully!');
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

    
    function displaySearchResults(results) {
        const searchResultsContainer = document.getElementById('searchResults');
        searchResultsContainer.innerHTML = ''; // Clear previous search results
    
        // Check if results are not empty
        if (results && results.length > 0) {
            // Create an unordered list to hold the search results
            const ul = document.createElement('ul');
    
            // Iterate through each search result
            results.forEach(result => {
                // Create a list item for each result
                const li = document.createElement('li');
                li.textContent = `Appointment ID: ${result.apptid}, Date: ${result.apptdate}, Patient ID: ${result.pxid}, Gender: ${result.pxgender}, Doctor ID: ${result.doctorid}, Hospital: ${result.hospitalname}, City: ${result.hospitalcity}, Province: ${result.hospitalprovince}, Region: ${result.hospitalregion}`;
    
                // Append the list item to the unordered list
                ul.appendChild(li);
            });
    
            // Append the unordered list to the search results container
            searchResultsContainer.appendChild(ul);
        } else {
            // If no results found, display a message
            searchResultsContainer.textContent = 'No results found.';
        }
    }

    // Get the clear search results button
    const clearSearchResultsButton = document.getElementById('clearSearch');
    // Add click event listener to the clear search results button
    clearSearchResultsButton.addEventListener('click', function() {
        console.log('Clear Search Field Button Clicked');
        // Get the search results container
        const searchResultsContainer = document.getElementById('searchResults');
        // Clear the content of the search results container
        searchResultsContainer.innerHTML = '';
    });

    const clearSearchFieldButton = document.getElementById('clearSearchField');

    // Add click event listener to the clear search results button
    clearSearchFieldButton.addEventListener('click', function() {
        console.log('Clear Search Field Button Clicked');
        // Get the appointment ID input field inside the search form
        const apptidInput = searchForm.querySelector('#apptid');
        // Clear the value of the input field
        apptidInput.value = '';
    });
    

    function convertFormDataToJson(formData) {
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });
        return jsonData;
    }

});
