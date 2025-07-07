/**
 * Attendee Routes: Event viewing and ticket booking
 * 
 * Learning Resources:
 * @see https://expressjs.com/en/guide/routing.html
 * @see https://github.com/TryGhost/node-sqlite3/wiki/API#databaserunsql-param--callback
 * @see https://expressjs.com/en/api.html#req.params
 */

const express = require("express");
const router = express.Router();

// === VALIDATION FUNCTIONS ===

/**
 * Validates event ID parameter to prevent injection
 * @param {string} eventId - The event ID from request parameters
 * @returns {boolean} - True if valid integer
 */
function isValidEventId(eventId) {
    const id = parseInt(eventId);
    return !isNaN(id) && id > 0;
}

/**
 * Sanitizes attendee name input
 * @param {string} name - Raw attendee name
 * @returns {string} - Sanitized name
 */
function sanitizeAttendeeName(name) {
    if (!name) return '';
    return name.toString().trim().substring(0, 100);
}

// === PUBLIC ROUTES ===
// === Without Assistance - Start ===

/**
 * Display attendee home page with published events
 * Shows all events available for booking
 */
router.get("/", (req, res, next) => {
    const settingsQuery = "SELECT * FROM site_settings LIMIT 1";
    
    global.db.get(settingsQuery, (err, settings) => {
        if (err) {
            next(err);
        } else {
            // Only show published events, ordered by date
            const eventsQuery = "SELECT * FROM events WHERE status = 'published' ORDER BY event_date ASC";
            
            global.db.all(eventsQuery, (err, events) => {
                if (err) {
                    next(err);
                } else {
                    res.render("attendee-home.ejs", {
                        settings: settings || { site_name: 'Event Manager', site_description: 'Book your events' },
                        events: events
                    });
                }
            });
        }
    });
});
// === Without Assistance - END ===

/**
 * Display event details page with ticket availability
 * Calculates remaining tickets by subtracting bookings from total
 */
router.get("/event/:id", (req, res, next) => {
    const eventId = req.params.id;
    
    // Validate event ID to prevent injection
    if (!isValidEventId(eventId)) {
        return res.status(400).send("Invalid event ID");
    }
    
    // Only allow access to published events
    const query = "SELECT * FROM events WHERE event_id = ? AND status = 'published'";
    
    global.db.get(query, [eventId], (err, event) => {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send("Event not found");
        } else {
            // Calculate total booked tickets using SUM aggregate
            const bookingsQuery = "SELECT SUM(full_price_tickets) as full_booked, SUM(concession_tickets) as concession_booked FROM bookings WHERE event_id = ?";
            
            global.db.get(bookingsQuery, [eventId], (err, bookings) => {
                if (err) {
                    next(err);
                } else {
                    // Handle NULL values from SUM when no bookings exist
                    const fullBooked = bookings.full_booked || 0;
                    const concessionBooked = bookings.concession_booked || 0;
                    
                    // Calculate remaining tickets
                    event.full_remaining = event.full_price_tickets - fullBooked;
                    event.concession_remaining = event.concession_tickets - concessionBooked;
                    
                    res.render("attendee-event.ejs", { event: event });
                }
            });
        }
    });
});

/**
 * Process ticket booking with availability validation
 * Prevents overbooking by checking availability before insertion
 */
router.post("/book/:id", (req, res, next) => {
    const eventId = req.params.id;
    const { attendee_name, full_price_tickets, concession_tickets } = req.body;
    
    // Validate event ID
    if (!isValidEventId(eventId)) {
        return res.status(400).send("Invalid event ID");
    }
    
    // Sanitize and validate attendee name
    const sanitizedName = sanitizeAttendeeName(attendee_name);
    if (!sanitizedName) {
        return res.status(400).send("Attendee name is required");
    }
    
    // parseInt with fallback to 0
    const fullTickets = parseInt(full_price_tickets) || 0;
    const concessionTickets = parseInt(concession_tickets) || 0;
    
    // Ensure at least one ticket is selected
    if (fullTickets === 0 && concessionTickets === 0) {
        return res.status(400).send("Please select at least one ticket");
    }
    
    // Validate ticket quantities are positive
    if (fullTickets < 0 || concessionTickets < 0) {
        return res.status(400).send("Invalid ticket quantity");
    }
    
    // Get event details to check availability
    const eventQuery = "SELECT * FROM events WHERE event_id = ?";
    
    global.db.get(eventQuery, [eventId], (err, event) => {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send("Event not found");
        } else {
            // Check current bookings to prevent race conditions
            const bookingsQuery = "SELECT SUM(full_price_tickets) as full_booked, SUM(concession_tickets) as concession_booked FROM bookings WHERE event_id = ?";
            
            global.db.get(bookingsQuery, [eventId], (err, bookings) => {
                if (err) {
                    next(err);
                } else {
                    const fullBooked = bookings.full_booked || 0;
                    const concessionBooked = bookings.concession_booked || 0;
                    
                    // Calculate available tickets
                    const fullAvailable = event.full_price_tickets - fullBooked;
                    const concessionAvailable = event.concession_tickets - concessionBooked;
                    
                    // Prevent overbooking
                    if (fullTickets > fullAvailable || concessionTickets > concessionAvailable) {
                        return res.status(400).send("Not enough tickets available");
                    }
                    
                    // Insert booking with parameterized query to prevent SQL injection
                    const insertQuery = "INSERT INTO bookings (event_id, attendee_name, full_price_tickets, concession_tickets) VALUES (?, ?, ?, ?)";
                    
                    global.db.run(insertQuery, [eventId, sanitizedName, fullTickets, concessionTickets], function(err) {
                        if (err) {
                            next(err);
                        } else {
                            // Render confirmation page with booking details
                            res.render("booking-confirmation.ejs", {
                                event: event,
                                attendee_name: sanitizedName,
                                full_tickets: fullTickets,
                                concession_tickets: concessionTickets,
                                booking_id: this.lastID // Provides the auto-generated booking ID
                            });
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;