// Requiring modules
const express = require('express');
const cors = require('cors');
const { createPool, pool } = require('mysql2');

const app = express();
app.use(express.json());
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


    /// Route to handle inserting data
    app.post('/insertAppt', async (req, res) => {
        const data = req.body;
        console.log(data);
    
        let sourcePool = central;
        let destinationPool = determinePool(data)
    
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

// Route to handle updating appointment information after verifying appointment ID exists
app.put('/verifyAndUpdateAppt/:apptid', (req, res) => {
    const apptid = req.params.apptid;
    const updatedData = req.body;

    // First, check if the appointment ID exists
    pool.query('SELECT * FROM appointments WHERE apptid = ?', [apptid], (err, result) => {
        if (err) {
            console.error('Error checking appointment ID:', err);
            return res.status(500).json({ error: 'Error checking appointment ID' });
        }

        if (result.length > 0) {
            // Appointment ID exists, proceed with update
            pool.query(`UPDATE appointments
                        SET apptdate = ?, pxid = ?, pxage = ?, pxgender = ?, doctorid = ?, hospitalname = ?, hospitalcity = ?, hospitalprovince = ?, hospitalregion = ?
                        WHERE apptid = ?`,
                        [updatedData.apptdate, updatedData.pxid, updatedData.pxage, updatedData.pxgender, updatedData.doctorid, updatedData.hospitalname, updatedData.hospitalcity, updatedData.hospitalprovince, updatedData.hospitalregion, apptid],
                        (updateErr, updateResult) => {
                if (updateErr) {
                    console.error('Error updating data:', updateErr);
                    return res.status(500).json({ error: 'Error updating data' });
                } else {
                    console.log('Data updated successfully:', updateResult);
                    return res.json({ message: 'Data updated successfully' });
                }
            });
        } else {
            // Appointment ID does not exist
            console.log('Appointment ID does not exist:', apptid);
            return res.status(404).json({ message: 'Appointment ID does not exist' });
        }
    });
});

// app.post('/totalCountAppointments', (req, res) => {
//     // Extract the region parameter from the request body
//     const { region } = req.body;

//     // Construct SQL query to calculate total appointments count
//     let query = 'SELECT COUNT(*) AS totalAppointments FROM appointment';

//     // Add a WHERE clause based on the selected region, if it's not "all"
//     if (region !== 'all') {
//         query += ` WHERE region = '${region}'`;
//     }

//     pool.query(query, (err, result) => {
//         if (err) {
//             console.error('Error counting total appointments:', err);
//             res.status(500).json({ error: 'Error counting total appointments' });
//         } else {
//             const totalAppointments = result[0].totalAppointments;

//             console.log('Total Count of Appointments:', totalAppointments);
//             res.json({ totalAppointments: totalAppointments });
//         }
//     });
// });


function determinePool(data) {
    switch (data.hospitalregion) {
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
