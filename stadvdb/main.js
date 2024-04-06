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
    

    //const selectedRegion = document.getElementById('regionSelect').value

    function convertFormDataToJson(formData) {
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });
        return jsonData;
    }


    function fetchData(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                return data;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                throw error;
            });
    }

    populateDropdown('dropdown1')
    populateDropdown('dropdown2')
    populateDropdown('dropdown3')
    // Function to populate dropdown
    function populateDropdown(dropdownID) {
        fetchData('http://localhost:3000/getApptIds')
            .then(data => {
                // Process the data received from the backend
                console.log('Data received:', data);
                // Call functions or update UI with the data

                var dropdown = document.getElementById(dropdownID);
                dropdown.innerHTML = ''; // Clear existing options

                // Iterate through the first 10 elements in the data array
                for (let i = 0; i < Math.min(data.length, 10); i++) {
                    const row = data[i];
                    // Create an option element for each row
                    var option = document.createElement('option');
                    option.value = row.apptid; // Set the value of the option to the appointment ID
                    option.text = row.apptid; // Set the text of the option to the appointment ID
                    dropdown.appendChild(option); // Append the option to the dropdown
                }
            })
            .catch(error => {
                // Handle errors here
                console.error('Error:', error);
                // Display error message or take appropriate action
            });
    }


    function displayReadAgeResults(data) {
        console.log(data);
        const divToDisplay = document.getElementById('readAgeResults');
    
        divToDisplay.innerHTML = ''; // Clear previous read age results
        
        // Check if data is not empty and contains age information
        if (data.centralAge || data.destinationAge) {
            // Create paragraph elements to hold the age results
            const centralAgeParagraph = document.createElement('p');
            centralAgeParagraph.textContent = `Patient Age from Central Pool: ${data.centralAge}`;
            
            const destinationAgeParagraph = document.createElement('p');
            destinationAgeParagraph.textContent = `Patient Age from Destination Pool: ${data.destinationAge}`;
        
            // Append the paragraphs to the read age results div
            divToDisplay.appendChild(centralAgeParagraph);
            divToDisplay.appendChild(destinationAgeParagraph);
        } else {
            // If no data found or missing age information, display a message
            divToDisplay.textContent = 'No valid age information found.';
        }
    }

    function displayUpdatedAgeResults(data) {
        console.log(data);
        const divToDisplay = document.getElementById('updatedAgeResults');
    
        divToDisplay.innerHTML = ''; // Clear previous read age results
        
        // Check if data is not empty and contains age information
        if (data.centralAge && data.destinationAge) {
            // Create paragraph elements to hold the age results
            const centralAgeParagraph = document.createElement('p');
            centralAgeParagraph.textContent = `Patient Age from Central Pool: ${data.centralAge}`;
            
            const destinationAgeParagraph = document.createElement('p');
            destinationAgeParagraph.textContent = `Patient Age from Destination Pool: ${data.destinationAge}`;
        
            // Append the paragraphs to the read age results div
            divToDisplay.appendChild(centralAgeParagraph);
            divToDisplay.appendChild(destinationAgeParagraph);
        } else {
            // If no data found or missing age information, display a message
            divToDisplay.textContent = 'No valid age information found.';
        }
    }
    
    
    document.getElementById('readPatientAge').addEventListener('click', function() {
        let apptIdToRead = document.getElementById('dropdown1').value;
        console.log(apptIdToRead);
    
         // Fetch hospital region by appointment ID
         fetch('http://localhost:3000/getHospitalRegion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apptid: apptIdToRead })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Extract hospital region from response data
            const hospitalRegion = data.hospitalRegion;
    
            // Create an object with the data to send to the backend for reading age
            const readData = {
                apptid: apptIdToRead,
                hospitalRegion: hospitalRegion // Pass hospital region to the backend
            };
    
            // Send a POST request to read age with hospital region included
            return fetch('http://localhost:3000/readAge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(readData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Handle success response from the backend
            console.log('Success:', data);
            // Optionally, update the UI or display a success message
            displayReadAgeResults(data)
        })
        .catch(error => {
            // Handle error from the backend or network error
            console.error('Error:', error);
            // Optionally, display an error message to the user
        });
    });
    
      
    document.getElementById('updatePatientAge').addEventListener('click', function() {
        let apptIdToUpdate = document.getElementById('dropdown2').value;
        console.log(apptIdToUpdate);
        let ageToUpdate = document.getElementById('updateAge').value;
    
        // Fetch hospital region by appointment ID
        fetch('http://localhost:3000/getHospitalRegion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apptid: apptIdToUpdate })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Extract hospital region from response data
            const hospitalRegion = data.hospitalRegion;
    
            // Create an object with the data to send to the backend for updating age
            const updateData = {
                apptid: apptIdToUpdate,
                newAge: ageToUpdate,
                hospitalRegion: hospitalRegion // Pass hospital region to the backend
            };
    
            // Send a POST request to update age with hospital region included
            return fetch('http://localhost:3000/updateAge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Handle success response from the backend
            console.log('Success:', data);
            // Optionally, update the UI or display a success message
            displayUpdatedAgeResults(data)
        })
        .catch(error => {
            // Handle error from the backend or network error
            console.error('Error:', error);
            // Optionally, display an error message to the user
        });
    });


    // Function to update button text and color
    function updateButton(buttonId, region) {
        
        const button = document.getElementById(buttonId);
        if (regions[region]) {
            button.textContent = `Turn Off ${region.charAt(0).toUpperCase() + region.slice(1)}`;
            button.style.backgroundColor = 'green';
        } else {
            button.textContent = `Turn On ${region.charAt(0).toUpperCase() + region.slice(1)}`;
            button.style.backgroundColor = 'red';
        }
    }

    

    let regions = {}; // Define regions variable globally to make it accessible to all functions

    // Fetch the regions data from the backend
    fetch('http://localhost:3000/regions')
    .then(response => response.json())
    .then(data => {
        console.log(data.regions)
        regions = data.regions; // Update the global regions variable with the fetched data
        // Update buttons initially
        for (let region in regions) {
            updateButton(`${region}Btn`, region);
        }
    })
    .catch(error => {
        console.error('Error fetching regions data:', error);
    });


    // Function to toggle region value and update button
    function toggleRegion(region) {
        regions[region] = !regions[region]; // Update frontend data
        updateButton(`${region}Btn`, region); // Update button UI

        // Update backend data
        fetch('http://localhost:3000/toggleRegion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ region: region, value: regions[region] })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message); // Log success message from backend
        })
        .catch(error => {
            console.error('Error toggling region:', error);
        });
    }

    // Add event listeners to buttons
    document.getElementById('centralBtn').addEventListener('click', function() {
        toggleRegion('central');
    });

    document.getElementById('luzonBtn').addEventListener('click', function() {
        toggleRegion('luzon');
    });

    document.getElementById('visayas_mindanaoBtn').addEventListener('click', function() {
        toggleRegion('visayas_mindanao');
    });


    let simulateFailure = false;

    function toggleFailureButton() {
        simulateFailure = !simulateFailure;
        const button = document.getElementById('simulateFailureBtn');
        button.textContent = simulateFailure ? 'Simulate Failure is On' : 'Simulate Failure is Off';
    }

    document.getElementById('simulateFailureBtn').addEventListener('click', function() {
        toggleFailureButton();
        fetch('http://localhost:3000/toggleFailure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ simulateFailure: simulateFailure })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
        })
        .catch(error => {
            console.error('Error toggling failure simulation:', error);
        });
    });



});
