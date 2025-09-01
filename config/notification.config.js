// Notification System Configuration
// Copy these environment variables to your .env file

module.exports = {
    // Email Configuration (Gmail example)
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD
    },

    // Twilio SMS Configuration
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
    },

    // Frontend URL (for email links)
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Timezone for cron jobs
    timezone: 'Asia/Kolkata',

    // Notification settings
    notifications: {
        // Daily reminder time (24-hour format)
        dailyReminderTime: '08:00',
        
        // Cleanup schedule (0 = Sunday, 2 = 2 AM)
        cleanupSchedule: '0 2 * * 0',
        
        // Appointment reminder frequency (every hour)
        appointmentReminderFrequency: '0 * * * *',
        
        // Cleanup old notifications older than X days
        cleanupOlderThanDays: 30
    }
};

// Required Environment Variables:
/*
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Frontend URL
FRONTEND_URL=http://localhost:3000
*/

