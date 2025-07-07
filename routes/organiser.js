/**
 * Organiser Routes - Event management with authentication
 * 
 * Learning Resources:
 * @see https://www.youtube.com/watch?v=DYme1m4RiwI
 * @see https://www.youtube.com/watch?v=L72fhGm1tfE
 * @see https://expressjs.com/en/guide/routing.html
 * @see https://joi.dev/api/?v=17.9.1#string
 * @see https://nodejs.org/en/docs/guides/security/
 * @see https://expressjs.com/en/advanced/best-practice-security.html
 */

const express = require("express");
const router = express.Router();
const crypto = require('crypto');
const Joi = require('joi');

const ORGANISER_PASSWORD = process.env.ORGANISER_PASSWORD;

// === VALIDATION SCHEMAS WITH CUSTOM MESSAGES ===

const eventSchema = Joi.object({
    title: Joi.string()
        .min(1)
        .max(200)
        .required()
        .trim()
        .messages({
            'string.empty': 'Event title is required',
            'string.min': 'Event title cannot be empty',
            'string.max': 'Event title must be less than 200 characters',
            'any.required': 'Event title is required'
        }),
    description: Joi.string()
        .min(1)
        .max(1000)
        .required()
        .trim()
        .messages({
            'string.empty': 'Event description is required',
            'string.min': 'Event description cannot be empty',
            'string.max': 'Event description must be less than 1000 characters',
            'any.required': 'Event description is required'
        }),
    event_date: Joi.date()
        .iso()
        .min('now')
        .required()
        .messages({
            'date.base': 'Please enter a valid date and time',
            'date.min': 'Event date must be in the future',
            'any.required': 'Event date is required'
        }),
    full_price_tickets: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .required()
        .messages({
            'number.base': 'Number of full price tickets must be a number',
            'number.integer': 'Number of full price tickets must be a whole number',
            'number.min': 'Must have at least 1 full price ticket',
            'number.max': 'Cannot have more than 10,000 full price tickets',
            'any.required': 'Number of full price tickets is required'
        }),
    full_price_cost: Joi.number()
        .precision(2)
        .min(0.01)
        .max(99999.99)
        .required()
        .messages({
            'number.base': 'Full price ticket cost must be a number',
            'number.min': 'Full price ticket cost must be at least $0.01',
            'number.max': 'Full price ticket cost cannot exceed $99,999.99',
            'any.required': 'Full price ticket cost is required'
        }),
    concession_tickets: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .required()
        .messages({
            'number.base': 'Number of concession tickets must be a number',
            'number.integer': 'Number of concession tickets must be a whole number',
            'number.min': 'Must have at least 1 concession ticket',
            'number.max': 'Cannot have more than 10,000 concession tickets',
            'any.required': 'Number of concession tickets is required'
        }),
    concession_cost: Joi.number()
        .precision(2)
        .min(0.01)
        .max(99999.99)
        .required()
        .messages({
            'number.base': 'Concession ticket cost must be a number',
            'number.min': 'Concession ticket cost must be at least $0.01',
            'number.max': 'Concession ticket cost cannot exceed $99,999.99',
            'any.required': 'Concession ticket cost is required'
        })
});

const settingsSchema = Joi.object({
    site_name: Joi.string()
        .min(1)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'Site name is required',
            'string.min': 'Site name cannot be empty',
            'string.max': 'Site name must be less than 100 characters',
            'any.required': 'Site name is required'
        }),
    site_description: Joi.string()
        .min(1)
        .max(500)
        .required()
        .trim()
        .messages({
            'string.empty': 'Site description is required',
            'string.min': 'Site description cannot be empty',
            'string.max': 'Site description must be less than 500 characters',
            'any.required': 'Site description is required'
        })
});

// === PREVENT BRUTE FORCE ATTACKS ===

// Rate limiting configuration
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

/**
 * Tracking failed login attempts per IP
 * @see https://expressjs.com/en/advanced/best-practice-security.html#preventing-brute-force-attacks
 * @see https://www.youtube.com/watch?v=DYme1m4RiwI
 */
function rateLimitLogin(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    if (Date.now() - attempts.lastAttempt > LOCKOUT_TIME) {
        attempts.count = 0;
    }
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeLeft = Math.ceil((LOCKOUT_TIME - (Date.now() - attempts.lastAttempt)) / 60000);
        return res.render("organiser-login.ejs", { 
            error: `Too many failed attempts. Please try again in ${timeLeft} minutes.` 
        });
    }
    
    next();
}

/**
 * Timing-safe password comparison to prevent timing attacks
 * @see https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
 */
function verifyPassword(password) {
    if (!password || !ORGANISER_PASSWORD) return false;
    
    const providedBuffer = Buffer.from(password, 'utf8');
    const storedBuffer = Buffer.from(ORGANISER_PASSWORD, 'utf8');
    
    if (providedBuffer.length !== storedBuffer.length) return false;
    
    return crypto.timingSafeEqual(providedBuffer, storedBuffer);
}

// === Without Assistance - Start ===
/**
 * Middleware to ensure user is authenticated before accessing protected routes
 */
function requireAuth(req, res, next) {
    if (req.session?.isAuthenticated) {
        return next();
    }
    res.redirect('/organiser/login');
}

// === AUTHENTICATION ROUTES ===

/**
 * Display login form
 */
router.get("/login", (req, res) => {
    if (req.session?.isAuthenticated) {
        return res.redirect('/organiser');
    }
    res.render("organiser-login.ejs", { error: null });
});
// === Without Assistance - END ===

/**
 * Process login credentials with rate limiting
 */
router.post("/login", rateLimitLogin, (req, res) => {
    const { password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    const isValidPassword = verifyPassword(password);
    
    if (isValidPassword) {
        loginAttempts.delete(ip);
        req.session.isAuthenticated = true;
        req.session.loginTime = Date.now();
        res.redirect("/organiser");
    } else {
        const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
        attempts.count += 1;
        attempts.lastAttempt = Date.now();
        loginAttempts.set(ip, attempts);
        
        res.render("organiser-login.ejs", { 
            error: "Invalid credentials. Please try again." 
        });
    }
});

// === Without Assistance - START ===
/**
 * Destroy session and logout user
 */
router.post("/logout", requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.clearCookie('sessionId');
        res.redirect("/");
    });
});
// === Without Assistance - END ===

// === DASHBOARD & SETTINGS ===

/**
 * Display organiser dashboard with events and statistics
 */
router.get("/", requireAuth, (req, res, next) => {
    const settingsQuery = "SELECT * FROM site_settings LIMIT 1";
    
    global.db.get(settingsQuery, (err, settings) => {
        if (err) {
            next(err);
        } else {
            const publishedQuery = `
                SELECT e.*, 
                       COALESCE(SUM(b.full_price_tickets), 0) as full_sold,
                       COALESCE(SUM(b.concession_tickets), 0) as concession_sold
                FROM events e
                LEFT JOIN bookings b ON e.event_id = b.event_id
                WHERE e.status = 'published'
                GROUP BY e.event_id
                ORDER BY e.event_date
            `;
            
            global.db.all(publishedQuery, (err, publishedEvents) => {
                if (err) {
                    next(err);
                } else {
                    // Format dates for published events
                    publishedEvents.forEach(event => {
                        if (event.event_date) {
                            // Handle both timestamp and ISO string formats
                            const date = isNaN(event.event_date) ? new Date(event.event_date) : new Date(parseFloat(event.event_date));
                            event.event_date = date.toLocaleString();
                        }
                        if (event.created_date) {
                            event.created_date = new Date(event.created_date).toLocaleString();
                        }
                        if (event.published_date) {
                            event.published_date = new Date(event.published_date).toLocaleString();
                        }
                    });
                    
                    const draftQuery = "SELECT * FROM events WHERE status = 'draft' ORDER BY created_date DESC";
                    
                    global.db.all(draftQuery, (err, draftEvents) => {
                        if (err) {
                            next(err);
                        } else {
                            // Format dates for draft events
                            draftEvents.forEach(event => {
                                if (event.event_date) {
                                    // Handle both timestamp and ISO string formats
                                    const date = isNaN(event.event_date) ? new Date(event.event_date) : new Date(parseFloat(event.event_date));
                                    event.event_date = date.toLocaleString();
                                }
                                if (event.created_date) {
                                    event.created_date = new Date(event.created_date).toLocaleString();
                                }
                                if (event.last_modified) {
                                    event.last_modified = new Date(event.last_modified).toLocaleString();
                                }
                            });
                            
                            res.render("organiser-home.ejs", {
                                settings: settings || { site_name: 'Event Manager', site_description: 'Manage your events' },
                                publishedEvents: publishedEvents,
                                draftEvents: draftEvents
                            });
                        }
                    });
                }
            });
        }
    });
});

// === Without Assistance - START ===
/**
 * Display site settings form
 */
router.get("/settings", requireAuth, (req, res, next) => {
    const query = "SELECT * FROM site_settings LIMIT 1";
    
    global.db.get(query, (err, settings) => {
        if (err) {
            next(err);
        } else {
            res.render("site-settings.ejs", {
                settings: settings || { site_name: 'Event Manager', site_description: 'Manage your events' }
            });
        }
    });
});
// === Without Assistance - END ===

/**
 * Update site settings with validation
 */
router.post("/settings", requireAuth, (req, res, next) => {
    // Validate input using Joi schema
    const { error, value } = settingsSchema.validate({
        site_name: req.body.site_name,
        site_description: req.body.site_description
    });
    
    if (error) {
        const query = "SELECT * FROM site_settings LIMIT 1";
        global.db.get(query, (err, settings) => {
            res.status(400).render("site-settings.ejs", {
                settings: settings || { site_name: '', site_description: '' },
                error: error.details[0].message
            });
        });
        return;
    }
    
    const { site_name, site_description } = value;
    
    const query = "UPDATE site_settings SET site_name = ?, site_description = ? WHERE setting_id = 1";
    
    global.db.run(query, [site_name, site_description], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect("/organiser");
        }
    });
});

// === EVENT MANAGEMENT ROUTES ===

// === Without Assistance - START ===

/**
 * Create new draft event
 */
router.post("/create-event", requireAuth, (req, res, next) => {
    const query = "INSERT INTO events (title, description) VALUES (?, ?)";
    
    global.db.run(query, ['New Event', 'Event description'], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect(`/organiser/edit-event/${this.lastID}`);
        }
    });
});

/**
 * Display event edit form
 */
router.get("/edit-event/:id", requireAuth, (req, res, next) => {
    const eventId = req.params.id;
    const query = "SELECT * FROM events WHERE event_id = ?";
    
    global.db.get(query, [eventId], (err, event) => {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send("Event not found");
        } else {
            if (event.event_date) {
                event.event_date = new Date(event.event_date).toISOString().slice(0, 16);
            }
            res.render("edit-event.ejs", { event: event, error: undefined });
        }
    });
});

// === Without Assistance - END ===

/**
 * Update event details with validation
 */
router.post("/edit-event/:id", requireAuth, (req, res, next) => {
    const eventId = req.params.id;
    
    // Validate input using Joi schema
    const { error, value } = eventSchema.validate({
        title: req.body.title,
        description: req.body.description,
        event_date: req.body.event_date,
        full_price_tickets: req.body.full_price_tickets,
        full_price_cost: req.body.full_price_cost,
        concession_tickets: req.body.concession_tickets,
        concession_cost: req.body.concession_cost
    }, { convert: true });
    
    if (error) {
        // Get the event data for re-rendering the form
        const query = "SELECT * FROM events WHERE event_id = ?";
        global.db.get(query, [eventId], (dbErr, event) => {
            if (dbErr) return next(dbErr);
            
            if (event && event.event_date) {
                event.event_date = new Date(event.event_date).toISOString().slice(0, 16);
            }
            
            return res.status(400).render("edit-event.ejs", { 
                event: event || req.body, 
                error: error.details[0].message 
            });
        });
        return;
    }
    
    const { title, description, event_date, full_price_tickets, full_price_cost, concession_tickets, concession_cost } = value;
    
    const eventDateISO = new Date(event_date).toISOString();
    
    const query = `UPDATE events SET 
        title = ?, description = ?, event_date = ?, 
        full_price_tickets = ?, full_price_cost = ?, 
        concession_tickets = ?, concession_cost = ?,
        last_modified = CURRENT_TIMESTAMP
        WHERE event_id = ?`;
    
    global.db.run(query, [title, description, eventDateISO, full_price_tickets, full_price_cost, concession_tickets, concession_cost, eventId], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect("/organiser");
        }
    });
});

// === Without Assistance - START ===

/**
 * Publish draft event
 */
router.post("/publish-event/:id", requireAuth, (req, res, next) => {
    const eventId = req.params.id;
    const query = "UPDATE events SET status = 'published', published_date = CURRENT_TIMESTAMP WHERE event_id = ?";
    
    global.db.run(query, [eventId], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect("/organiser");
        }
    });
});

/**
 * Delete event permanently
 */
router.post("/delete-event/:id", requireAuth, (req, res, next) => {
    const eventId = req.params.id;
    const query = "DELETE FROM events WHERE event_id = ?";
    
    global.db.run(query, [eventId], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect("/organiser");
        }
    });
});

// === BOOKING MANAGEMENT ROUTES ===

/**
 * Display all bookings made for events
 */
router.get("/bookings", requireAuth, (req, res, next) => {
    const query = `
        SELECT 
            b.booking_id,
            b.attendee_name,
            b.full_price_tickets,
            b.concession_tickets,
            b.booking_date,
            e.title as event_title,
            e.event_date,
            (b.full_price_tickets * e.full_price_cost + b.concession_tickets * e.concession_cost) as total_cost
        FROM bookings b
        JOIN events e ON b.event_id = e.event_id
        ORDER BY b.booking_date DESC
    `;
    
    global.db.all(query, (err, bookings) => {
        if (err) {
            next(err);
        } else {
            // Get summary statistics
            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_bookings,
                    SUM(b.full_price_tickets + b.concession_tickets) as total_tickets,
                    SUM(b.full_price_tickets * e.full_price_cost + b.concession_tickets * e.concession_cost) as total_revenue
                FROM bookings b
                JOIN events e ON b.event_id = e.event_id
            `;
            
            global.db.get(summaryQuery, (err, summary) => {
                if (err) {
                    next(err);
                } else {
                    res.render("organiser-bookings.ejs", {
                        bookings: bookings,
                        summary: summary || { total_bookings: 0, total_tickets: 0, total_revenue: 0 }
                    });
                }
            });
        }
    });
});

// === Without Assistance - END ===

module.exports = router;