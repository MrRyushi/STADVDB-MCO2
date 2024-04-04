// Requiring modules
const express = require('express');
const cors = require('cors');
const { createPool } = require('mysql');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

const pool = createPool({
    host: "localhost",
    user: "root",
    password: "12345678",
    database: "mco2",
    connectionLimit: 10
});

// Route to handle inserting data
app.post('/insertAppt', (req, res) => {
    const data = req.body;
    console.log(data)
    pool.query(`INSERT INTO appointments (apptid, apptdate, pxid, pxage, pxgender, doctorid, hospitalname, hospitalcity, hospitalprovince, hospitalregion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.apptid, data.apptdate, data.pxid, data.pxage, data.pxgender, data.doctorid, data.hospitalname, data.hospitalcity, data.hospitalprovince, data.hospitalregion], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            res.status(500).json({ error: 'Error inserting data' });
        } else {
            console.log('Data inserted successfully:', result);
            res.json({ message: 'Data inserted successfully' });
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



// Route to handle searching data
app.post('/searchAppt', (req, res) => {
    const data = req.body;

    // Construct SQL query dynamically based on search parameters
    let query = 'SELECT * FROM your_table_name WHERE 1=1';
    const params = [];

    if (data.patientName) {
        query += ' AND patientName = ?';
        params.push(data.patientName);
    }
    if (data.apptdate) {
        query += ' AND apptdate = ?';
        params.push(data.apptdate);
    }
    if (data.hospitalname) {
        query += ' AND hospitalname = ?';
        params.push(data.hospitalname);
    }
    if (data.doctorname) {
        query += ' AND doctorname = ?';
        params.push(data.doctorname);
    }

    pool.query(query, params, (err, result) => {
        if (err) {
            console.error('Error searching data:', err);
            res.status(500).json({ error: 'Error searching data' });
        } else {
            console.log('Search results:', result);
            res.json(result);
        }
    });
});

app.post('/totalCountAppointments', (req, res) => {
    // Extract the region parameter from the request body
    const { region } = req.body;

    // Construct SQL query to calculate total appointments count
    let query = 'SELECT COUNT(*) AS totalAppointments FROM your_table_name';

    // Add a WHERE clause based on the selected region, if it's not "all"
    if (region !== 'all') {
        query += ` WHERE region = '${region}'`;
    }

    pool.query(query, (err, result) => {
        if (err) {
            console.error('Error counting total appointments:', err);
            res.status(500).json({ error: 'Error counting total appointments' });
        } else {
            const totalAppointments = result[0].totalAppointments;

            console.log('Total Count of Appointments:', totalAppointments);
            res.json({ totalAppointments: totalAppointments });
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
