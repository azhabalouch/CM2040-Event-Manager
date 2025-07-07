/**
 * Event Manager Application
 * 
 * @author Azha Balouch
 * @version 1.0.0
 */

require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");

/**
 * Configure request parsing and basic security
 * @see https://github.com/expressjs/body-parser#bodyparserurlencodedoptions
 */
app.use(bodyParser.urlencoded({ 
    extended: true,
    limit: '1mb'
}));

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.disable('x-powered-by');

/**
 * Setup secure session management
 */
const session = require('express-session');

if (!process.env.SESSION_SECRET) {
    console.error('ERROR: SESSION_SECRET environment variable is required');
    process.exit(1);
}

if (!process.env.ORGANISER_PASSWORD) {
    console.error('ERROR: ORGANISER_PASSWORD environment variable is required');
    process.exit(1);
}

/**
 * Configure session management with secure cookies
 * @see https://github.com/expressjs/session  -- (cookie.secure)
*/
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'strict'
    }
}));

/**
 * Initialize database with foreign key constraints
 */
const sqlite3 = require('sqlite3').verbose();
global.db = new sqlite3.Database('./database.db', function(err){
    if(err){
        console.error(err);
        process.exit(1);
    } else {
        console.log("Database connected");
        global.db.run("PRAGMA foreign_keys=ON");
    }
});

// === Without Assistance - START ===

/**
 * Application routes
 */
app.get('/', (req, res) => {
    res.render('index.ejs');
});

const organiserRoutes = require('./routes/organiser');
app.use('/organiser', organiserRoutes);

const attendeeRoutes = require('./routes/attendee');
app.use('/attendee', attendeeRoutes);

/**
 * Handle 404 and server errors
 */
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        statusCode: 404,
        showBackButton: true
    });
});

app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).render('error', {
        title: 'Something went wrong',
        message: isDevelopment ? err.message : 'An internal server error occurred.',
        statusCode: err.status || 500,
        showBackButton: true,
        error: isDevelopment ? err : {}
    });
});

/**
 * Start server
 */
app.listen(port, () => {
    console.log(`Event Manager listening on port ${port}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// === Without Assistance - END ===