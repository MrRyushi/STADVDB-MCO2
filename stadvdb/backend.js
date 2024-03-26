// Requiring modules
const express = require('express');
const { createPool } = require('mysql');

const app = express();
const pool = createPool({
    host: "localhost",
    user: "root",
    password: "admin12345678",
    database: "appointments",
    connectionLimit: 10
});

// Route to handle inserting data
app.post('/insertAppt', (req, res) => {
    const data = req.body;

    pool.query('INSERT INTO your_table_name (patientName, apptdate, hospitalname, doctorname) VALUES (?, ?, ?, ?)', data, (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            res.status(500).json({ error: 'Error inserting data' });
        } else {
            console.log('Data inserted successfully:', result);
            res.json({ message: 'Data inserted successfully' });
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
