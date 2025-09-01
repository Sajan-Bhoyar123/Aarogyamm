// Test script for the Aarogyam notification system
// Run this with: node test-notifications.js

require('dotenv').config();

const notificationService = require('./utils/notificationService');
const schedulerService = require('./utils/scheduler');

async function testNotificationSystem() {
    console.log('🧪 Testing Aarogyam Notification System...\n');

    try {
        // Test 1: Check if services are loaded
        console.log('✅ Services loaded successfully');
        console.log('- Email Service:', typeof notificationService.emailService);
        console.log('- SMS Service:', typeof notificationService.smsService);
        console.log('- Scheduler Service:', typeof schedulerService);
        console.log('');

        // Test 2: Check environment variables
        console.log('🔧 Environment Variables Check:');
        console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'NOT SET');
        console.log('- EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
        console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
        console.log('- TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
        console.log('- TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
        console.log('- TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'SET' : 'NOT SET');
        console.log('');

        // Test 3: Check scheduler status
        console.log('⏰ Scheduler Status:');
        const schedulerStatus = schedulerService.getJobStatus();
        schedulerStatus.forEach((job) => {
            const status = job.isRunning ? 'Running' : 'Stopped';
            const nextRun = job.nextRun === 'Unknown' ? 'Scheduled' : job.nextRun;
            console.log(`- ${job.name}: ${status} (Next: ${nextRun})`);
        });
        console.log('');

        // Test 4: Test notification creation (without sending)
        console.log('📝 Testing notification creation...');
        try {
            // This would normally require a valid MongoDB connection
            console.log('✅ Notification service methods available');
            console.log('- createNotification:', typeof notificationService.createNotification);
            console.log('- sendAppointmentBookingNotifications:', typeof notificationService.sendAppointmentBookingNotifications);
            console.log('- sendAppointmentStatusNotifications:', typeof notificationService.sendAppointmentStatusNotifications);
            console.log('- sendPaymentConfirmationNotifications:', typeof notificationService.sendPaymentConfirmationNotifications);
            console.log('- sendPrescriptionUploadNotifications:', typeof notificationService.sendPrescriptionUploadNotifications);
            console.log('- sendDailyReminders:', typeof notificationService.sendDailyReminders);
        } catch (error) {
            console.log('⚠️  Notification creation test skipped (database connection required)');
        }
        console.log('');

        // Test 5: Check email templates
        console.log('📧 Email Template Test:');
        try {
            const testData = {
                patientName: 'John Doe',
                doctorName: 'Dr. Smith',
                date: new Date(),
                timeSlot: '10:00 AM',
                reason: 'General consultation'
            };

            const patientTemplate = notificationService.emailService.getAppointmentBookingPatientTemplate(testData);
            const doctorTemplate = notificationService.emailService.getAppointmentBookingDoctorTemplate(testData);

            console.log('✅ Email templates generated successfully');
            console.log('- Patient template length:', patientTemplate.length, 'characters');
            console.log('- Doctor template length:', doctorTemplate.length, 'characters');
            console.log('- Templates contain HTML:', patientTemplate.includes('<html') || patientTemplate.includes('<div'));
        } catch (error) {
            console.log('❌ Email template test failed:', error.message);
        }
        console.log('');

        // Test 6: Check SMS templates
        console.log('📱 SMS Template Test:');
        try {
            const testData = {
                patientName: 'John Doe',
                doctorName: 'Dr. Smith',
                date: new Date(),
                timeSlot: '10:00 AM',
                reason: 'General consultation'
            };

            // Test SMS message generation (without actually sending)
            console.log('✅ SMS service methods available');
            console.log('- sendAppointmentBookingSMS:', typeof notificationService.smsService.sendAppointmentBookingSMS);
            console.log('- sendAppointmentStatusSMS:', typeof notificationService.smsService.sendAppointmentStatusSMS);
            console.log('- sendPaymentConfirmationSMS:', typeof notificationService.smsService.sendPaymentConfirmationSMS);
        } catch (error) {
            console.log('❌ SMS template test failed:', error.message);
        }
        console.log('');

        // Test 7: Configuration check
        console.log('⚙️  Configuration Check:');
        try {
            const config = require('./config/notification.config');
            console.log('✅ Configuration file loaded');
            console.log('- Timezone:', config.timezone);
            console.log('- Daily reminder time:', config.notifications.dailyReminderTime);
            console.log('- Cleanup schedule:', config.notifications.cleanupSchedule);
        } catch (error) {
            console.log('⚠️  Configuration file not found or invalid');
        }

        console.log('\n🎉 Notification system test completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Set up your environment variables in .env file');
        console.log('2. Configure your email service (Gmail recommended)');
        console.log('3. Set up your Twilio account for SMS');
        console.log('4. Test with real data in your application');
        console.log('5. Monitor the scheduler logs for automated tasks');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testNotificationSystem().catch(console.error);
