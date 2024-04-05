// Requiring modules
const express = require('express');
const cors = require('cors');
const { createPool, pool } = require('mysql2');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(cors()); // Enable CORS for all routes

const central = createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 20072,
    user: "root",
    password: "jsxY5kXeGgFWuqp8R79AE3KB",
    database: "central",
    connectionLimit: 10
});

const luzon = createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 20073,
    user: "root",
    password: "jsxY5kXeGgFWuqp8R79AE3KB",
    database: "luzon",
    connectionLimit: 10
});

const vismin = createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 20074,
    user: "root",
    password: "jsxY5kXeGgFWuqp8R79AE3KB",
    database: "vismin",
    connectionLimit: 10
});

// Function to synchronize appointment data from luzon/vismin with central
function syncInsertAppointmentData(destinationPool, data) {
    checkAppointmentExists(destinationPool, data.apptid, (appointmentExists) => {
        if (appointmentExists) {
            console.log(`Appointment ID ${data.apptid} already exists in destination pool`);
        } else {
            console.log(destinationPool);
            destinationPool.query(`INSERT INTO appointment (apptid, apptdate, pxid, pxage, pxgender, doctorid, hospitalname, hospitalcity, hospitalprovince, hospitalregion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.apptid, data.apptdate, data.pxid, data.pxage, data.pxgender, data.doctorid, data.hospitalname, data.hospitalcity, data.hospitalprovince, data.hospitalregion], (err, result) => {
                if (err) {
                    console.error('Error inserting data into destination pool:', err);
                } else {
                    console.log('Data inserted into destination pool successfully:', result);
                }
            });
        }
    });
}

function syncUpdateAppointmentData(destinationPool, data) {
    checkAppointmentExists(destinationPool, data.apptid, (appointmentExists) => {
        if (!appointmentExists) {
            console.log(`Appointment ID ${data.apptid} does not exist in destination pool`);
        } else {
            console.log(destinationPool);
            destinationPool.query(`UPDATE appointment SET apptdate = ?, pxid = ?, pxage = ?, pxgender = ?, doctorid = ?, hospitalname = ?, hospitalcity = ?, hospitalprovince = ?, hospitalregion = ? WHERE apptid = ?`, [data.apptdate, data.pxid, data.pxage, data.pxgender, data.doctorid, data.hospitalname, data.hospitalcity, data.hospitalprovince, data.hospitalregion, data.apptid], (err, result) => {
                if (err) {
                    console.error('Error updating data in destination pool:', err);
                } else {
                    console.log('Data updated in destination pool successfully:', result);
                }
            });
        }
    });
}

// Function to check if an appointment ID exists
function checkAppointmentExists(pool, apptid, callback) {
    pool.query('SELECT * FROM appointment WHERE apptid = ?', [apptid], (err, result) => {
        if (err) {
            console.error('Error checking appointment ID:', err);
            callback(false);
        } else {
            // If any record is returned, the appointment ID exists
            const appointmentExists = result.length > 0;
            if (appointmentExists) {
                console.log(`Appointment ID ${apptid} already exists.`);
            }
            callback(appointmentExists); // Return the actual existence status
        }
    });
}

function determinePool(hospitalregion) {
    switch (hospitalregion) {
        case 'Ilocos Region (Region I)':
        case 'Cagayan Valley (Region II)':
        case 'Central Luzon (Region III)':
        case 'CALABARZON (Region IV-A)':
        case 'Bicol Region (Region V)':
        case 'National Capital Region (NCR)':
        case 'Cordillera Administrative Region (CAR)':
        case 'MIMAROPA Region':
            return luzon; 
        case 'Western Visayas (Region VI)':
        case 'Central Visayas (Region VII)':
        case 'Eastern Visayas (Region VIII)':
        case 'Zamboanga Peninsula (Region IX)':
        case 'Northern Mindanao (Region X)':
        case 'Davao Region (Region XI)':
        case 'SOCCSKSARGEN (Cotabato Region) (XII)':
        case 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)':
        case 'Caraga (Region XIII)':
            return vismin;
        default:
            // If no specific region is specified or unknown, default to central
            return central
    }
}

/// Route to handle inserting data
app.post('/insertAppt', async (req, res) => {
    const data = req.body;
    console.log(data);

    let sourcePool = central;
    let destinationPool = determinePool(data.hospitalRegion)

    // Check if the appointment ID already exists
    checkAppointmentExists(sourcePool, data.apptid, (appointmentExists) => {
        if (appointmentExists) {
            return res.status(400).json({ error: 'Appointment ID already exists' });
        } else {
            sourcePool.query(`INSERT INTO appointment (apptid, apptdate, pxid, pxage, pxgender, doctorid, hospitalname, hospitalcity, hospitalprovince, hospitalregion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.apptid, data.apptdate, data.pxid, data.pxage, data.pxgender, data.doctorid, data.hospitalname, data.hospitalcity, data.hospitalprovince, data.hospitalregion], (err, result) => {
                if (err) {
                    console.error('Error inserting data into source:', err);
                    return res.status(500).json({ error: 'Error inserting data into source' });
                } else {
                    console.log('Data inserted into source successfully:', result);
            
                    // Synchronize inserted data 
                    if (destinationPool != central) {
                        syncInsertAppointmentData(destinationPool, data);
                    }
                    
                    res.json({ message: 'Data inserted successfully' });
                }
            });
        }
    });
});
    
    
// Route to handle searching data
app.post('/searchAppt', (req, res) => {
    const data = req.body;

    console.log('Received search request:', data);
    console.log(data)

    let poolToUse = central

    // Construct SQL query to search only for apptid
    let query = `SELECT * FROM appointment WHERE apptid = '${data.apptid}'`;
    
    // Execute the SQL query using the selected pool
    poolToUse.query(query, (err, result) => {
        if (err) {
            console.error('Error searching data:', err);
            res.status(500).json({ error: 'Error searching data' });
        } else {
            console.log('Search results:', result);
            res.json(result);
        }
    });
});

app.put('/updateAppt', async (req, res) => {
    const data = req.body;
    console.log(data);

    // Check if the required fields are present in the request body
    const requiredFields = ['apptid', 'apptdate', 'pxid', 'pxage', 'pxgender', 'doctorid', 'hospitalname', 'hospitalcity', 'hospitalprovince', 'hospitalregion'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            return res.status(400).json({ error: `Missing required field: ${field}` });
        }
    }
    let sourcePool = central;
    let destinationPool = determinePool(data.hospitalRegion)

    // Check if the appointment ID already exists
    checkAppointmentExists(sourcePool, data.apptid, (appointmentExists) => {
        if (!appointmentExists) {
            return res.status(400).json({ error: 'Appointment ID does not exist' });
        } else {
            sourcePool.query(`UPDATE appointment SET apptdate = ?, pxid = ?, pxage = ?, pxgender = ?, doctorid = ?, hospitalname = ?, hospitalcity = ?, hospitalprovince = ?, hospitalregion = ? WHERE apptid = ?`, [data.apptdate, data.pxid, data.pxage, data.pxgender, data.doctorid, data.hospitalname, data.hospitalcity, data.hospitalprovince, data.hospitalregion, data.apptid], (err, result) => {
                if (err) {
                    console.error('Error updating data in source:', err);
                    return res.status(500).json({ error: 'Error updating data in source' });
                } else {
                    console.log('Data updated in source successfully:', result);

                    // Synchronize updated data
                    if (destinationPool != central) {
                        syncUpdateAppointmentData(destinationPool, data); // Make sure you have this function defined
                    }

                    res.json({ message: 'Data updated successfully' });
                }
            });
        }
    });
});



// Route to fetch data from MySQL and send to frontend
app.get('/getApptIds', (req, res) => {
    const query = 'SELECT apptid, hospitalregion FROM central.appointment'; // Modify this query according to your requirement
  
    central.query(query, (err, results) => {
      if (err) {
        console.error('Error executing MySQL query: ' + err.stack);
        res.status(500).send('Internal Server Error');
        return;
      }
      // Send data to frontend as JSON
      res.json(results);
    });
  });


// TASK 2 CASE 1
// Route to handle reading the same data item
app.post('/readAge', (req, res) => {
    const apptid = req.body.apptid;
    const hospitalRegion = req.body.hospitalRegion;
    const query = `SELECT pxage FROM appointment WHERE apptid = ?`;
    let destinationPool = determinePool(hospitalRegion);
    
    // Use Promise.all to execute both queries concurrently
    Promise.all([
        // First query to central pool
        new Promise((resolve, reject) => {
            central.query(query, [apptid], (error, results, fields) => {
                if (error) {
                    console.error('Error reading patient age from central pool:', error);
                    reject(error);
                    return;
                }
                // Resolve with the patient's age if found, otherwise null
                const centralAge = results.length > 0 ? results[0].pxage : null;
                resolve(centralAge);
            });
        }),
        // Second query to destination pool
        new Promise((resolve, reject) => {
            destinationPool.query(query, [apptid], (error, results, fields) => {
                if (error) {
                    console.error('Error reading patient age from destination pool:', error);
                    reject(error);
                    return;
                }
                // Resolve with the patient's age if found, otherwise null
                const destinationAge = results.length > 0 ? results[0].pxage : null;
                resolve(destinationAge)
            });
        })
    ])
    .then(([centralAge, destinationAge]) => {
        // Send response with patient age from both pools
        res.json({
            centralAge: centralAge,
            destinationAge: destinationAge,
            message: 'Patient age read successfully'
        });
    })
    .catch(error => {
        // Handle errors
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    });
});



// TASK 2 CASE 2 Route to handle updating a column in MySQL
/*
At least one transaction in the 3 nodes is writing (update / delete) and the
other concurrent transactions are reading the same data item.
*/
app.post('/updateAge', (req, res) => {
    const id = req.body.id;
    const newAge = req.body.newAge;
    const hospitalRegion = req.body.hospitalRegion;
    const query = `UPDATE appointment SET pxage = ? WHERE apptid = ?`;
    let destinationPool = determinePool(hospitalRegion)

    // Use Promise.all to wait for both queries to complete
    Promise.all([
        // First query
        new Promise((resolve, reject) => {
            central.query(query, [newAge, id], (error, results, fields) => {
                if (error) {
                    console.error('Error updating column:', error);
                    reject('Error updating column');
                    return;
                }
                console.log('Column updated successfully');
                resolve();
            });
        }),
        // Second query
        new Promise((resolve, reject) => {
            destinationPool.query(query, [newAge, id], (error, results, fields) => {
                if (error) {
                    console.error('Error updating column:', error);
                    reject('Error updating column');
                    return;
                }
                console.log('Column updated successfully');
                resolve();
            });
        })
    ])
    .then(() => {
        // Send response after both queries have completed
        res.json({ message: 'Column updated successfully' });
    })
    .catch(error => {
        // Handle errors
        console.error('Error:', error);
        res.status(500).json({ error: error });
    });
});


// Route to get hospital region by appointment ID
app.post('/getHospitalRegion', (req, res) => {
    const { apptid } = req.body;

    // Query to fetch hospital region by appointment ID
    const query = 'SELECT hospitalregion FROM appointment WHERE apptid = ?';

    // Execute the query
    central.query(query, [apptid], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Check if appointment ID exists
        if (results.length === 0) {
            res.status(404).json({ error: 'Appointment ID not found' });
            return;
        }

        // Extract hospital region from the result
        const hospitalRegion = results[0].hospitalregion;

        // Send hospital region as JSON response
        res.json({ hospitalRegion });
    });
});





// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
