// Requiring modules
const express = require('express');
const cors = require('cors');
const { createPool, pool } = require('mysql2');
const fs = require('fs');
const path = require('path');
const { log } = require('console');

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

// Function to synchronize appointment data from luzon/vismin to central
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

/// Route to handle inserting data
app.post('/insertAppt', async (req, res) => {
    const data = req.body;
    const hospitalRegion = data.hospitalRegion;
    console.log(data);

    let sourcePool = central;
    let destinationPool = determinePool(hospitalRegion)

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
    const hospitalRegion = data.hospitalregion
    console.log(data);

    // Check if the required fields are present in the request body
    const requiredFields = ['apptid', 'apptdate', 'pxid', 'pxage', 'pxgender', 'doctorid', 'hospitalname', 'hospitalcity', 'hospitalprovince', 'hospitalregion'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            return res.status(400).json({ error: `Missing required field: ${field}` });
        }
    }
    let sourcePool = central;
    let destinationPool = determinePool(hospitalRegion)

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

 //Function for ISOLATION LEVEL SERIALIZABLE
 global.setSerializable = function(pool) {
     //console.log('setSerializable called');
     return new Promise((resolve, reject) => {
         pool.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE', (error, results, fields) => {
            //console.log('pool.query callback called');
             if (error) {
                 console.error('Error setting transaction isolation level:', error);
                 reject(error);
             } else {
                //console.log('Transaction isolation level set to SERIALIZABLE');
                 resolve();
             }
         });
     });
 };

// TASK 2 CASE 1
// Route to handle reading the same data item
app.post('/readAge', (req, res) => {
    const apptid = req.body.apptid;
    const hospitalRegion = req.body.hospitalRegion;
    const query = `SELECT pxage FROM appointment WHERE apptid = ?`;
    let destinationPool = determinePool(hospitalRegion);
    let island = determineIsland(hospitalRegion);

    // Call the global function to set the transaction isolation level
    Promise.all([
        global.setSerializable(central),
        global.setSerializable(luzon),
        global.setSerializable(vismin),
    ])
    .then(() => {
        // Continue with the rest of the code after the isolation level has been set
        //console.log('Transaction isolation level set to SERIALIZABLE for all pools');
        return Promise.all([
            // First query to central pool
            new Promise((resolve, reject) => {
                central.query(query, [apptid], (error, results, fields) => {
                if (regions.central) {
                    if (error) {
                        console.error('Error reading patient age from central pool:', error);
                        reject(error);
                        return;
                    }
                    // Resolve with the patient's age if found, otherwise null
                    const centralAge = results.length > 0 ? results[0].pxage : null;
                    resolve(centralAge);
                    console.log(centralAge)
                }
                else {
                    console.log("Attempted to read on offline Central Node")
                    resolve(); // Resolve even if no update was performed
                }
  
                });
            }),
            // Second query to destination pool
            new Promise((resolve, reject) => {
                if (island == 'luzon') {
                    if (regions.luzon) {
                        destinationPool.query(query, [apptid], (error, results, fields) => {
                            if (error) {
                                console.error('Error reading patient age from destination pool:', error);
                                reject(error);
                                return;
                            }
                            // Resolve with the patient's age if found, otherwise null
                            const destinationAge = results.length > 0 ? results[0].pxage : null;
                            resolve(destinationAge);
                        });
                    } else {
                        console.log("Attempted to read on offline Luzon Node")
                        resolve(); // Resolve even if no update was performed
                    }
                } else if (island == 'vismin') {
                    if (regions.visayas_mindanao) {
                        destinationPool.query(query, [apptid], (error, results, fields) => {
                            if (error) {
                                console.error('Error reading patient age from destination pool:', error);
                                reject(error);
                                return;
                            }
                            // Resolve with the patient's age if found, otherwise null
                            const destinationAge = results.length > 0 ? results[0].pxage : null;
                            resolve(destinationAge);
                        });
                    } else {
                        console.log("Attempted to read on offline Vismin Node")
                        resolve(); // Resolve even if no update was performed
                    }
                }
                
            })
        ])
    })
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


//----------- STEP 3 ----------------

const regions = {
    central: true,
    luzon: true,
    visayas_mindanao: true
};


// TASK 2 CASE 2 Route to handle updating a column in MySQL
/*
At least one transaction in the 3 nodes is writing (update / delete) and the
other concurrent transactions are reading the same data item.
*/
app.post('/updateAge', (req, res) => {
    const apptid = req.body.apptid;
    const newAge = req.body.newAge;
    const hospitalRegion = req.body.hospitalRegion;
    const query1 = `SELECT pxage FROM appointment WHERE apptid = ?`;
    const query2 = `UPDATE appointment SET pxage = ? WHERE apptid = ?`;
    let destinationPool = determinePool(hospitalRegion);
    const island = determineIsland(hospitalRegion);
    console.log("island: " + island);

    // Call the global function to set the transaction isolation level
    Promise.all([
        global.setSerializable(central),
        global.setSerializable(luzon),
        global.setSerializable(vismin),
    ])
    .then(() => {
        // Execute update queries first
        return Promise.all([
            // First query to update
            new Promise((resolve, reject) => {
                if (regions.central) {

                    central.query(query2, [newAge, apptid], (error, results, fields) => {
                        if (error) {
                            console.error('Error updating column:', error);
                            reject('Error updating column');
                            return;
                        }
                        console.log('Central Column updated successfully');
                        resolve();
                    });
                } else {
                    if (shouldSimulateFailure()) {
                        try {
                            throwError('central')
                        } 
                        catch (e) {                    
                            console.error(e);
                            writeLogs(apptid, newAge, 'central');
                            resolve(); // Resolve even if no update was performed
                    
                        }
                    } else {
                        writeLogs(apptid, newAge, 'central');
                        resolve(); // Resolve even if no update was performed
                    }
                }
            }),
            // Second query to update
            new Promise((resolve, reject) => {
                if (island == 'luzon') {
                    if (regions.luzon) {
                        destinationPool.query(query2, [newAge, apptid], (error, results, fields) => {
                            if (error) {
                                console.error('Error updating column:', error);
                                reject('Error updating column');
                                return;
                            }
                            console.log('Luzon Column updated successfully');
                            resolve();
                        });
                    } else {
                        if (shouldSimulateFailure()) {
                           
                            try {
                                throwError('luzon')
                            }
                            catch (e) {
                                console.error(e);
                                writeLogs(apptid, newAge, 'luzon');
                                resolve(); // Resolve even if no update was performed                
                            }
                        }
                        else {
                            writeLogs(apptid, newAge, 'luzon');
                            resolve(); // Resolve even if no update was performed
                        }
                        
                    }
                } else if (island == 'vismin') {
                    if (regions.visayas_mindanao) {    
                        destinationPool.query(query2, [newAge, apptid], (error, results, fields) => {
                            if (error) {
                                console.error('Error updating column:', error);
                                reject('Error updating column');
                                return;
                            }
                            console.log('Vismin Column updated successfully');
                            resolve();
                        });
                    } else {
                        if (shouldSimulateFailure()) {
                            try {
                                throwError('visayas_mindanao')
                            } 
                            catch (e) {
                                console.error(e);
                                writeLogs(apptid, newAge, 'visayas_mindanao');
                                resolve(); // Resolve even if no update was performed
                            }  
                        } 
                        else {
                            writeLogs(apptid, newAge, 'visayas_mindanao');
                            resolve(); // Resolve even if no update was performed
                        }

                    }
                } else {
                    resolve(); // Resolve if island is not luzon or vismin
                }
            })
        ]);
    })
    .then(() => {
        // After updates, perform read queries
        return Promise.all([
            // First query to read central pool
            new Promise((resolve, reject) => {
                central.query(query1, [apptid], (error, results, fields) => {
                    if (error) {
                        console.error('Error reading patient age from central pool:', error);
                        reject(error);
                        return;
                    }
                    const centralAge = results.length > 0 ? results[0].pxage : null;
                    console.log("New Age (central): " + centralAge);
                    resolve(centralAge);
                });
            }),
            // Second query to read destination pool
            new Promise((resolve, reject) => {
                destinationPool.query(query1, [apptid], (error, results, fields) => {
                    if (error) {
                        console.error('Error reading patient age from destination pool:', error);
                        reject(error);
                        return;
                    }
                    const destinationAge = results.length > 0 ? results[0].pxage : null;
                    console.log("New Age (destination pool): " + destinationAge);
                    resolve(destinationAge);
                });
            })
        ]);
    })
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
        res.status(500).json({ error: error });
    });
});

function throwError(node) {
    throw new Error(`Simulating failure in writing to ${node} node`);
}
// Modify shouldSimulateFailure function to return the value of the failure simulation state
let simulateFailureToggle;

function shouldSimulateFailure() {
    if (simulateFailureToggle === true) {
        return true;
    } else if (simulateFailureToggle === false) {
        return false;
    }
}

// Route to toggle failure simulation
app.post('/toggleFailure', (req, res) => {
    const { simulateFailure } = req.body;

    // Set the global variable to the received value
    simulateFailureToggle = simulateFailure;
    console.log(simulateFailureToggle)

    // Send a response indicating success
    res.json({ message: `Failure simulation toggled ${simulateFailure ? 'on' : 'off'}.` });
});

// Route to handle concurrent read and write operations across different nodes
app.post('/concurrentReadWrite', (req, res) => {
    const apptid = req.body.apptid;
    const newAge = req.body.newAge;
    const hospitalRegion = req.body.hospitalRegion;
    const query = `SELECT pxage FROM appointment WHERE apptid = ?`;
    const centralPool = central;
    let destinationPool = determinePool(hospitalRegion);

    // Call the global function to set the transaction isolation level
    Promise.all([
        global.setSerializable(centralPool),
        global.setSerializable(destinationPool)
    ])
    .then(() => {
        // Continue with the rest of the code after the isolation level has been set
        return Promise.all([
            // Query to read the patient's age from the destination pool
            new Promise((resolve, reject) => {
                destinationPool.query(query, [apptid], (error, results, fields) => {
                    if (error) {
                        console.error('Error reading patient age from destination pool:', error);
                        reject(error);
                        return;
                    }
                    // Resolve with the patient's age if found, otherwise null
                    const destinationAge = results.length > 0 ? results[0].pxage : null;
                    resolve(destinationAge);
                });
            }),
            // Query to update the patient's age in the central pool
            new Promise((resolve, reject) => {
                centralPool.query(`UPDATE appointment SET pxage = ? WHERE apptid = ?`, [newAge, apptid], (error, results, fields) => {
                    if (error) {
                        console.error('Error updating patient age in central pool:', error);
                        reject(error);
                        return;
                    }
                    resolve();
                });
            })
        ]);
    })
    .then(([destinationAge]) => {
        // Send response with the patient's age from the destination pool
        res.json({ destinationAge, message: 'Concurrent read and write operations completed successfully' });
    })
    .catch(error => {
        // Handle errors
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

// Create an endpoint to serve the `regions` data
app.get('/regions', (req, res) => {
    res.json({ regions });
});

function writeLogs(apptid, age, node){
    const logsFolder = 'crash logs';
    let fileName;
    switch(node) {
        case 'central': fileName='central_crash_logs.txt'; break;
        case 'luzon': fileName='luzon_crash_logs.txt'; break;
        case 'visayas_mindanao': fileName='visayas_mindanao_crash_logs.txt'; break;
    }
    const filePath = path.join(__dirname, logsFolder, fileName);
    
    const logData = `ApptId: ${apptid}, Age:${age}\n`;
    
    // Check if the directory exists, if not, create it
    if (!fs.existsSync(path.join(__dirname, logsFolder))) {
        fs.mkdirSync(path.join(__dirname, logsFolder));
    }
    
    // Write to the file
    fs.appendFile(filePath, logData, 'utf8', (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return;
        }
        console.log('Data has been written to file successfully.');
    });
}

// Route to toggle region status and handle crash logs if region is toggled back on
app.post('/toggleRegion', (req, res) => {
    const { region, value } = req.body;
    console.log(region)

    // Update the value of the region received from the request
    regions[region] = value;

    // If the region is being toggled back on, read crash logs and update the database
    if (value) {
        let node = region;
        let logs = readLogs(node); // Read crash logs for the specified region
        if (logs && logs.length > 0) { // Check if logs exist
            updateDatabaseFromLogs(logs, node); // Update the database with logs
            res.json({ message: `Region '${region}' toggled back on. Crash logs read and database updated.` });
        } else {
            res.json({ message: `Region '${region}' toggled back on. No crash logs found.` });
        }
    } else {
        // Send a response indicating success
        res.json({ message: `Region '${region}' toggled off.` });
    }
});

// Function to update the database with logs
function updateDatabaseFromLogs(logs, node) {
    let pool = determinePool(node)

    switch (node) {
        case 'central':
            pool = central
            break;
        case 'luzon':
            pool = luzon
            break;
        case 'visayas_mindanao':
            pool = vismin
            break;
        default:
            console.error('Invalid node:', node);
            break;
    }

    logs.forEach(log => {
        const [, apptid, age] = log.match(/ApptId: (\w+), Age:(\d+)/) || [];
        if (apptid && age) {
            const query = `UPDATE appointment SET pxage = ? WHERE apptid = ?`;
            pool.query(query, [age, apptid], (error, results) => {
                if (error) {
                    console.error(`Error updating database for appointment ID ${apptid}:`, error);
                } else {
                    console.log(`Database updated successfully for appointment ID ${apptid}`);
                }
            });
        } else {
            console.error(`Invalid log entry: ${log}`);
        }
    });
}

// Function to read crash logs for a specific region
function readLogs(node) {
    const logsFolder = 'crash logs';
    let fileName;
    switch (node) {
        case 'central':
            fileName = 'central_crash_logs.txt';
            break;
        case 'luzon':
            fileName = 'luzon_crash_logs.txt';
            break;
        case 'visayas_mindanao':
            fileName = 'visayas_mindanao_crash_logs.txt';
            break;
        default:
            console.error('Invalid node:', node);
            return []; // Return an empty array if node is not recognized
    }
    const filePath = path.join(__dirname, logsFolder, fileName);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        console.log(`No logs found for ${node}`);
        return []; // Return an empty array if the file doesn't exist
    }
    
    // Read the file contents
    const logs = fs.readFileSync(filePath, 'utf8');
    
    // Split logs by new line and filter out empty lines
    const logLines = logs.split('\n').filter(line => line.trim() !== '');

    // Clear the logs file
    clearLogsFile(node);

    // Return all logs for the specified region
    console.log("Filtered logs:", logLines);
    return logLines;
}

// Function to clear crash logs file for a specific region
function clearLogsFile(node) {
    const logsFolder = 'crash logs';
    let fileName;
    switch (node) {
        case 'central':
            fileName = 'central_crash_logs.txt';
            break;
        case 'luzon':
            fileName = 'luzon_crash_logs.txt';
            break;
        case 'visayas_mindanao':
            fileName = 'visayas_mindanao_crash_logs.txt';
            break;
        default:
            console.error('Invalid node:', node);
            return; // Return without doing anything if node is not recognized
    }
    const filePath = path.join(__dirname, logsFolder, fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        console.log(`No logs found for ${node}`);
        return; // Return without doing anything if the file doesn't exist
    }

    // Clear the file contents
    fs.writeFileSync(filePath, '', 'utf8', (err) => {
        if (err) {
            console.error('Error clearing logs file:', err);
        } else {
            console.log(`Logs cleared for ${node}`);
        }
    });
}


function determineIsland(region) {
    switch (region) {
        case 'Ilocos Region (Region I)':
        case 'Cagayan Valley (Region II)':
        case 'Central Luzon (Region III)':
        case 'CALABARZON (Region IV-A)':
        case 'Bicol Region (Region V)':
        case 'National Capital Region (NCR)':
        case 'Cordillera Administrative Region (CAR)':
        case 'MIMAROPA Region':
            return 'luzon'; 
        case 'Western Visayas (Region VI)':
        case 'Central Visayas (Region VII)':
        case 'Eastern Visayas (Region VIII)':
        case 'Zamboanga Peninsula (Region IX)':
        case 'Northern Mindanao (Region X)':
        case 'Davao Region (Region XI)':
        case 'SOCCSKSARGEN (Cotabato Region) (XII)':
        case 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)':
        case 'Caraga (Region XIII)':
            return 'vismin';
        default:
            // If no specific region is specified or unknown, default to central
            return 'central'
    }
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



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
