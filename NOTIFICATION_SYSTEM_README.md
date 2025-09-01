# Aarogyam Notification System

A comprehensive email and SMS notification system for the Aarogyam healthcare management platform, built with Node.js, Express.js, and MongoDB.

## Features

### 🔔 Notification Types
- **Appointment Bookings**: Notifies both patient and doctor when appointments are booked
- **Appointment Status Updates**: Notifies patients when appointments are confirmed/rejected/cancelled
- **Payment Confirmations**: Sends payment receipts to patients and doctors
- **Document Uploads**: Notifies patients when prescriptions/reports are uploaded
- **Daily Reminders**: Automated daily appointment reminders for both patients and doctors
- **24-Hour Reminders**: Sends reminders 24 hours before scheduled appointments

### 📧 Communication Channels
- **Email Notifications**: Professional HTML email templates
- **SMS Notifications**: Concise text messages via Twilio
- **In-App Notifications**: Stored in database for real-time access

### ⏰ Automated Scheduling
- Daily reminders at 8:00 AM IST
- Appointment reminders 24 hours before
- Automatic cleanup of old notifications
- Configurable cron schedules

## Installation

### 1. Install Dependencies
```bash
npm install nodemailer twilio node-cron
```

### 2. Environment Variables
Create a `.env` file in your project root with the following variables:

```env
# Email Configuration (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Database and other existing variables
ATLASDB_URL=your_mongodb_connection_string
SECRET=your_session_secret
```

### 3. Email Setup (Gmail)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use this password in `EMAIL_PASSWORD`

### 4. Twilio Setup
1. Create a Twilio account at [twilio.com](https://twilio.com)
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number for sending SMS
4. Add these credentials to your `.env` file

## Usage

### 1. Initialize the System
Add this to your `app.js`:

```javascript
// Import notification services
const notificationService = require('./utils/notificationService');
const schedulerService = require('./utils/scheduler');

// Start the scheduler
schedulerService.startAllJobs();
```

### 2. Add Notification Routes
```javascript
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);
```

### 3. Trigger Notifications in Your Controllers

#### Appointment Booking
```javascript
const notificationService = require('../utils/notificationService');

// After successfully creating an appointment
const result = await notificationService.sendAppointmentBookingNotifications(
    appointmentId,
    patientId,
    doctorId
);
```

#### Appointment Status Update
```javascript
// After updating appointment status
const result = await notificationService.sendAppointmentStatusNotifications(
    appointmentId,
    patientId,
    doctorId,
    'confirmed' // or 'rejected', 'cancelled'
);
```

#### Payment Confirmation
```javascript
// After successful payment
const result = await notificationService.sendPaymentConfirmationNotifications(
    paymentId,
    patientId,
    doctorId,
    {
        transactionId: 'txn_123',
        amount: 1000,
        patientName: 'John Doe',
        doctorName: 'Dr. Smith'
    }
);
```

#### Document Upload
```javascript
// After uploading prescription/report
const result = await notificationService.sendPrescriptionUploadNotifications(
    patientId,
    doctorId,
    'Prescription', // or 'Report'
    'https://example.com/document.pdf'
);
```

## API Endpoints

### Patient/Doctor Notifications
- `GET /api/notifications/user/:userType` - Get user notifications
- `PATCH /api/notifications/:notificationId/read` - Mark as read
- `PATCH /api/notifications/mark-all-read/:userType` - Mark all as read
- `GET /api/notifications/unread-count/:userType` - Get unread count
- `DELETE /api/notifications/:notificationId` - Delete notification
- `GET /api/notifications/stats/:userType` - Get notification statistics

### Admin Management
- `GET /api/notifications/admin/scheduler/status` - Get scheduler status
- `POST /api/notifications/admin/trigger-daily-reminders` - Manual trigger
- `POST /api/notifications/admin/trigger-cleanup` - Manual cleanup
- `POST /api/notifications/admin/scheduler/:action` - Start/stop scheduler

## Database Schema

### Notification Model
```javascript
{
    recipient: ObjectId,        // Patient or Doctor ID
    recipientModel: String,     // 'Patient' or 'Doctor'
    type: String,               // Notification type
    title: String,              // Notification title
    message: String,            // Notification message
    data: Object,               // Additional data
    emailSent: Boolean,         // Email delivery status
    smsSent: Boolean,           // SMS delivery status
    read: Boolean,              // Read status
    priority: String,           // 'low', 'medium', 'high'
    timestamps: true
}
```

## Email Templates

The system includes professional HTML email templates for:
- Appointment confirmations
- Status updates
- Payment receipts
- Document uploads
- Daily reminders

All templates are responsive and include:
- Aarogyam branding
- Clear call-to-action buttons
- Professional styling
- Mobile-friendly design

## SMS Templates

Concise SMS messages for:
- Appointment confirmations
- Status updates
- Payment confirmations
- Daily reminders
- 24-hour reminders

## Scheduling

### Cron Jobs
- **Daily Reminders**: `0 8 * * *` (8:00 AM IST)
- **Cleanup**: `0 2 * * 0` (Sunday 2:00 AM IST)
- **Appointment Reminders**: `0 * * * *` (Every hour)

### Timezone
All schedules use Indian Standard Time (IST) by default.

## Error Handling

The system includes comprehensive error handling:
- Failed email/SMS attempts are logged
- Database operations are wrapped in try-catch blocks
- Graceful fallbacks for service failures
- Detailed error logging for debugging

## Monitoring

### Scheduler Status
Check scheduler job status:
```javascript
const status = schedulerService.getJobStatus();
console.log(status);
```

### Notification Statistics
Get user notification statistics:
```javascript
const stats = await notificationService.getUserNotifications(userId, userType);
```

## Testing

### Manual Triggers
Test the system manually:
```javascript
// Trigger daily reminders
await schedulerService.triggerDailyReminders();

// Trigger cleanup
await schedulerService.triggerCleanup();
```

### Environment Testing
Test with different email/SMS services by updating environment variables.

## Security

- All routes are protected with authentication middleware
- User permissions are validated for each request
- Admin routes require admin privileges
- Sensitive data is not logged

## Performance

- Database indexes for efficient querying
- Pagination for large notification lists
- Automatic cleanup of old notifications
- Asynchronous processing for emails/SMS

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Gmail app password
   - Verify EMAIL_SERVICE setting
   - Check email credentials

2. **SMS not sending**
   - Verify Twilio credentials
   - Check phone number format
   - Ensure sufficient Twilio credits

3. **Scheduler not working**
   - Check timezone settings
   - Verify cron syntax
   - Check server time

### Debug Mode
Enable detailed logging by setting:
```javascript
process.env.NODE_ENV = 'development';
```

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include comprehensive testing
4. Update documentation
5. Follow security best practices

## License

This notification system is part of the Aarogyam healthcare management platform.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs
3. Verify environment configuration
4. Test with minimal setup

---

**Note**: This system requires active internet connectivity for email and SMS services. Ensure your server has proper network access and firewall configurations.

