## Setup Instructions

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   - Copy `.env.example` to `.env`
   - Set your organiser password in the `.env` file:
   ```
   ORGANISER_PASSWORD=your_secure_password
   SESSION_SECRET=your_random_secret_key

   example:
   ORGANISER_PASSWORD=admin2@
   SESSION_SECRET=8be3d1dcd7d23cfdb6fd603b0c06a7e8a7caa31cf2c8ff975fd861a14e04267f
   ```

4. **Build the database:**
   ```bash
   npm run build-db
   ```

5. **Start the application:**
   ```bash
   npm start
   ```

6. **Access the application:**
   - Main page: http://localhost:3000
   - Attendee page: http://localhost:3000/attendee
   - Organiser page: http://localhost:3000/organiser (requires login)

## Additional Libraries Used

- **joi**: Data validation and sanitization
- **express-session**: Secure session management
- **crypto**: Built-in Node.js module for security functions
