// Requiring modules
const express = require('express');
const cors = require('cors');
const { createPool } = require('mysql2');


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
function syncAppointmentData(sourcePool, destinationPool, tableName) {
    sourcePool.query(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            return;
        }

        // Insert fetched rows into the central database
        rows.forEach(row => {
            destinationPool.query(`INSERT INTO ${tableName} VALUES (?)`, row, (insertErr, result) => {
                if (insertErr) {
                    console.error('Error inserting data into central:', insertErr);
                } else {
                    console.log('Data inserted into central successfully:', result);
                }
            });
        });
    });
}

// Route to handle inserting data
app.post('/insertAppt', (req, res) => {
    const data = req.body;
    console.log(data);

    const region = req.body.region;
    let sourcePool;

    let port; // Declare variables to store host and port dynamically

    if (region === 'luzon') {
        sourcePool = luzon;
        port = 20073;
    } else if (region === 'visayas') {
        sourcePool = vismin;
        port = 20074;
    } else {
        res.status(400).json({ error: 'Invalid region' });
        return;
    }

    sourcePool.query(`INSERT INTO appointment (apptid, apptdate, pxid, pxage, pxgender, doctorid, hospitalname, hospitalcity, hospitalprovince, hospitalregion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.apptid, data.apptdate, data.pxid, data.pxage, data.pxgender, data.doctorid, data.hospitalname, data.hospitalcity, data.hospitalprovince, data.hospitalregion], (err, result) => {
        if (err) {
            console.error('Error inserting data into source:', err);
            res.status(500).json({ error: 'Error inserting data into source' });
        } else {
            console.log('Data inserted into source successfully:', result);

            // Synchronize inserted data to central database
            syncAppointmentData(sourcePool, central, 'appointments');

            res.json({ message: 'Data inserted successfully' });

        }
    });
});

// Route to handle searching data
app.post('/searchAppt', (req, res) => {
    const data = req.body;

    console.log('Received search request:', data);
    console.log(data)

    // Determine which pool to use based on the region specified in the request
    let poolToUse = determinePool(data)

    // Construct SQL query to search only for apptid
    let query = `SELECT * FROM appointment WHERE apptid = '${data.apptid}'`;
    const params = []

    
    // Execute the SQL query using the selected pool
    poolToUse.query(query, params, (err, result) => {
        if (err) {
            console.error('Error searching data:', err);
            res.status(500).json({ error: 'Error searching data' });
        } else {
            console.log('Search results:', result);
            res.json(result);
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
    switch (data.region) {
        case 'SOCCSKSARGEN (Cotabato Region) (XII)':
        case 'Central Visayas (VII)':
            return vismin;
        case 'National Capital Region (NCR)':
        case 'CALABARZON (IV-A)':
        case 'Ilocos Region (I)':
        case 'Central Luzon (III)':
            return luzon;
        default:
            // If no specific region is specified or unknown, default to central
            return central;
    }
}
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
