const express = require('express');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Initialize dotenv
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser());  // <-- Use cookie-parser

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API base URL (from swagger spec)
const API_URL = process.env.API_URL;

// Render login page
app.get('/', (req, res) => {
    res.render('index', { error: undefined });
});

// Handle login
app.post('/login', async (req, res) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: req.body.email,
            password: req.body.password,
        });

        // Store JWT token in session or cookies
        res.cookie('token', response.data.token);
        res.redirect('/dashboard');
    } catch (error) {
        // Pass the error message to the view
        res.render('index', { error: 'Invalid credentials' });
    }
});

// Render registration page
app.get('/register', (req, res) => {
    res.render('index', { error: undefined });
});

// Handle registration
app.post('/register', async (req, res) => {
    try {
        await axios.post(`${API_URL}/auth/register`, {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
        });
        res.redirect('/');
    } catch (error) {
        // Pass the error message to the view
        res.render('index', { error: 'Registration failed' });
    }
});

// Dashboard page - view all certificates
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/');
    }

    try {
        // Fetch the list of certificates from the API
        const response = await axios.get(`${API_URL}/certificates`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Pass the certificates to the dashboard view
        res.render('dashboard', { error: undefined, certificates: response.data });
    } catch (error) {
        res.render('dashboard', { error: 'Failed to load certificates' });
    }
});

// Handle certificate download
app.get('/certificates/:id/download', async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/');
    }

    const certificateId = req.params.id;

    try {
        const response = await axios.get(`${API_URL}/certificates/${certificateId}/download`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'stream'  // Important for file downloads
        });

        // Extract the file extension from the Content-Type header
        const contentType = response.headers['content-type'];  // e.g., 'application/pdf', 'image/png'
        const fileExtension = contentType.split('/')[1];  // Get the file extension (e.g., 'pdf', 'png')

        // Set the appropriate content-disposition header
        res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificateId}.${fileExtension}`);

        // Pipe the file stream to the response
        response.data.pipe(res);
    } catch (error) {
        console.error('Error downloading the certificate:', error);
        res.status(500).send('Failed to download the certificate.');
    }
});

// Render certificate upload page
app.get('/upload', (req, res) => {
    res.render('upload', { error: undefined });
});

// Handle certificate upload
app.post('/upload', upload.single('certificate'), async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/');
    }

    try {
        const formData = new FormData();
        formData.append('certificate', req.file.path);
        formData.append('activityName', req.body.activityName);

        const response = await axios.post(`${API_URL}/certificates/upload`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        res.redirect('/dashboard');
    } catch (error) {
        // Pass the error message to the view
        console.log(`${error}`)
        res.render('upload', { error: `Upload failed ${error}` });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at port ${port}`);
});
