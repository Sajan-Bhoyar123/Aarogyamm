# Quick Integration Guide

This guide shows you how to quickly integrate the notification system into your existing Aarogyam controllers.

## 1. Patient Controller Integration

### Appointment Booking
```javascript
// In your patient controller where appointments are created
const notificationService = require('../utils/notificationService');

// After successfully creating an appointment
const appointment = new Appointment({
    patientId: req.user._id,
    doctorId: doctorId,
    date: appointmentDate,
    timeSlot: timeSlot,
    reason: reason,
    status: 'pending'
});

await appointment.save();

// Send notifications
const notificationResult = await notificationService.sendAppointmentBookingNotifications(
    appointment._id,
    req.user._id,
    doctorId
);

if (notificationResult.success) {
    console.log('Notifications sent:', notificationResult.message);
} else {
    console.error('Notification failed:', notificationResult.error);
}
```

### Payment Confirmation
```javascript
// In your payment verification endpoint
const notificationResult = await notificationService.sendPaymentConfirmationNotifications(
    billingId,
    billing.patientId,
    billing.doctorId,
    {
        transactionId: razorpay_payment_id,
        amount: billing.amount,
        patientName: patient.username,
        doctorName: doctor.username
    }
);
```

## 2. Doctor Controller Integration

### Appointment Status Update
```javascript
// In your doctor controller where appointment status is updated
const notificationResult = await notificationService.sendAppointmentStatusNotifications(
    appointmentId,
    appointment.patientId,
    req.user._id, // doctor ID
    newStatus // 'confirmed', 'rejected', or 'cancelled'
);
```

### Prescription/Report Upload
```javascript
// After uploading a prescription or report
const notificationResult = await notificationService.sendPrescriptionUploadNotifications(
    patientId,
    req.user._id, // doctor ID
    'Prescription', // or 'Report'
    documentUrl // URL to the uploaded document
);
```

## 3. Health Record Controller Integration

### When Health Records are Updated
```javascript
// After updating health records
const notificationResult = await notificationService.sendPrescriptionUploadNotifications(
    patientId,
    req.user._id,
    'Health Record',
    recordUrl
);
```

## 4. Billing Controller Integration

### Payment Success
```javascript
// In your payment verification endpoint
app.post('/verify-payment/:billingId', async (req, res) => {
    // ... existing payment verification code ...
    
    if (expectedSignature === razorpay_signature) {
        try {
            const billing = await Billing.findById(billingId);
            billing.status = 'paid';
            await billing.save();

            // Send payment confirmation notifications
            const notificationResult = await notificationService.sendPaymentConfirmationNotifications(
                billingId,
                billing.patientId,
                billing.doctorId,
                {
                    transactionId: razorpay_payment_id,
                    amount: billing.amount,
                    patientName: patient.username,
                    doctorName: doctor.username
                }
            );

            return res.json({ success: true, notifications: notificationResult });
        } catch (err) {
            console.error('Error updating billing status:', err);
            return res.status(500).json({ success: false, error: 'Failed to update billing status' });
        }
    }
});
```

## 5. Frontend Integration

### Add Notification Bell to Navigation
```html
<!-- In your navigation template -->
<div class="notification-bell">
    <i class="fas fa-bell"></i>
    <span class="notification-count" id="unreadCount">0</span>
</div>
```

### JavaScript for Real-time Updates
```javascript
// Fetch unread notification count
async function fetchUnreadCount() {
    try {
        const response = await fetch(`/api/notifications/unread-count/${userType}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('unreadCount').textContent = data.unreadCount;
        }
    } catch (error) {
        console.error('Error fetching unread count:', error);
    }
}

// Fetch notifications
async function fetchNotifications(page = 1) {
    try {
        const response = await fetch(`/api/notifications/user/${userType}?page=${page}`);
        const data = await response.json();
        
        if (data.success) {
            displayNotifications(data.notifications);
            updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PATCH'
        });
        const data = await response.json();
        
        if (data.success) {
            // Update UI
            fetchUnreadCount();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchUnreadCount();
    fetchNotifications();
    
    // Refresh every 30 seconds
    setInterval(fetchUnreadCount, 30000);
});
```

## 6. Error Handling

### Graceful Fallback
```javascript
// Always wrap notification calls in try-catch
try {
    const notificationResult = await notificationService.sendAppointmentBookingNotifications(
        appointmentId,
        patientId,
        doctorId
    );
    
    if (notificationResult.success) {
        console.log('Notifications sent successfully');
    } else {
        console.warn('Some notifications failed:', notificationResult.error);
        // Continue with your application flow
    }
} catch (error) {
    console.error('Notification system error:', error);
    // Don't let notification failures break your main functionality
}
```

## 7. Testing

### Test Notifications Locally
```javascript
// In your development environment, you can test without real services
if (process.env.NODE_ENV === 'development') {
    // Test email templates
    const testTemplate = notificationService.emailService.getAppointmentBookingPatientTemplate({
        patientName: 'Test Patient',
        doctorName: 'Test Doctor',
        date: new Date(),
        timeSlot: '10:00 AM',
        reason: 'Test consultation'
    });
    
    console.log('Email template:', testTemplate);
}
```

## 8. Monitoring

### Check Scheduler Status
```javascript
// In your admin panel or logs
const schedulerStatus = schedulerService.getJobStatus();
console.log('Scheduler status:', schedulerStatus);
```

### Manual Triggers (Admin Only)
```javascript
// Trigger daily reminders manually
const result = await schedulerService.triggerDailyReminders();
console.log('Manual trigger result:', result);
```

## Quick Checklist

- [ ] Add notification service imports to controllers
- [ ] Add notification calls after key actions
- [ ] Add error handling for notification failures
- [ ] Test with real data
- [ ] Monitor scheduler logs
- [ ] Set up environment variables
- [ ] Configure email and SMS services

## Need Help?

1. Check the `NOTIFICATION_SYSTEM_README.md` for detailed setup
2. Run `node test-notifications.js` to verify your setup
3. Check the console logs for any errors
4. Verify your environment variables are set correctly

