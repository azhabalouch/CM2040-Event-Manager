-- Event Manager Database Schema
-- SQLite database initialization for event management system

-- Enable foreign key constraints
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Site configuration settings table
CREATE TABLE IF NOT EXISTS site_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL DEFAULT 'Event Manager',
    site_description TEXT NOT NULL DEFAULT 'Manage your events'
);

-- Event information and ticket details table
CREATE TABLE IF NOT EXISTS events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT,
    full_price_tickets INTEGER DEFAULT 0,
    full_price_cost REAL DEFAULT 0.0,
    concession_tickets INTEGER DEFAULT 0,
    concession_cost REAL DEFAULT 0.0,
    status TEXT DEFAULT 'draft', -- 'draft' or 'published'
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    published_date TEXT,
    last_modified TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Customer bookings and ticket purchases table
-- References events(event_id)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    attendee_name TEXT NOT NULL,
    full_price_tickets INTEGER DEFAULT 0,
    concession_tickets INTEGER DEFAULT 0,
    booking_date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Insert default site configuration
INSERT INTO site_settings (site_name, site_description) VALUES ('Event Manager', 'Your solution for event management');

COMMIT;
