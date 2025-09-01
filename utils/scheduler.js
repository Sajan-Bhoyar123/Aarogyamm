const cron = require('node-cron');
const notificationService = require('./notificationService');

class SchedulerService {
    constructor() {
        this.jobs = new Map();
        this.cronExpressions = {
            dailyReminders: '0 8 * * *',
            cleanup: '0 2 * * 0',
            appointmentReminders: '0 * * * *'
        };
        this.initializeJobs();
    }

    initializeJobs() {
        // Daily appointment reminders at 8:00 AM
        this.scheduleDailyReminders();
        
        // Cleanup old notifications every Sunday at 2:00 AM
        this.scheduleCleanup();
        
        // Appointment reminders 24 hours before (every hour)
        this.scheduleAppointmentReminders();
    }

    // Schedule daily appointment reminders
    scheduleDailyReminders() {
        const job = cron.schedule('0 8 * * *', async () => {
            console.log('Running daily appointment reminders...');
            try {
                const result = await notificationService.sendDailyReminders();
                if (result.success) {
                    console.log('Daily reminders completed:', result.message);
                } else {
                    console.error('Daily reminders failed:', result.error);
                }
            } catch (error) {
                console.error('Error in daily reminders cron job:', error);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Indian timezone
        });

        this.jobs.set('dailyReminders', job);
        console.log('Daily reminders scheduled for 8:00 AM IST');
    }

    // Schedule cleanup of old notifications
    scheduleCleanup() {
        const job = cron.schedule('0 2 * * 0', async () => {
            console.log('Running notification cleanup...');
            try {
                const result = await notificationService.cleanupOldNotifications();
                if (result.success) {
                    console.log('Cleanup completed:', result.message);
                } else {
                    console.error('Cleanup failed:', result.error);
                }
            } catch (error) {
                console.error('Error in cleanup cron job:', error);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        this.jobs.set('cleanup', job);
        console.log('Notification cleanup scheduled for Sundays at 2:00 AM IST');
    }

    // Schedule appointment reminders 24 hours before
    scheduleAppointmentReminders() {
        const job = cron.schedule('0 * * * *', async () => {
            console.log('Running appointment reminders...');
            try {
                await this.sendAppointmentReminders();
            } catch (error) {
                console.error('Error in appointment reminders cron job:', error);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        this.jobs.set('appointmentReminders', job);
        console.log('Appointment reminders scheduled for every hour');
    }

    // Send appointment reminders 24 hours before
    async sendAppointmentReminders() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Get appointments for tomorrow
            const Appointment = require('../models/appointment');
            const appointments = await Appointment.find({
                date: {
                    $gte: tomorrow,
                    $lt: dayAfterTomorrow
                },
                status: 'confirmed'
            }).populate('patientId doctorId');

            for (const appointment of appointments) {
                try {
                    // Send reminder to patient
                    if (appointment.patientId && appointment.patientId.phone) {
                        const appointmentData = {
                            patientName: appointment.patientId.username,
                            doctorName: appointment.doctorId.username,
                            date: appointment.date,
                            timeSlot: appointment.timeSlot,
                            reason: appointment.reason
                        };

                        await notificationService.smsService.sendAppointmentReminderSMS(
                            appointment.patientId.phone,
                            appointmentData
                        );

                        // Create notification record
                        await notificationService.createNotification(
                            appointment.patientId._id,
                            'Patient',
                            'appointment_reminder',
                            'Appointment Reminder',
                            `Reminder: You have an appointment with Dr. ${appointment.doctorId.username} tomorrow at ${appointment.timeSlot}.`,
                            { appointmentId: appointment._id, doctorName: appointment.doctorId.username }
                        );
                    }

                    // Send reminder to doctor
                    if (appointment.doctorId && appointment.doctorId.phone) {
                        const appointmentData = {
                            patientName: appointment.patientId.username,
                            doctorName: appointment.doctorId.username,
                            date: appointment.date,
                            timeSlot: appointment.timeSlot,
                            reason: appointment.reason
                        };

                        await notificationService.smsService.sendAppointmentReminderSMS(
                            appointment.doctorId.phone,
                            appointmentData
                        );

                        // Create notification record
                        await notificationService.createNotification(
                            appointment.doctorId._id,
                            'Doctor',
                            'appointment_reminder',
                            'Appointment Reminder',
                            `Reminder: You have an appointment with ${appointment.patientId.username} tomorrow at ${appointment.timeSlot}.`,
                            { appointmentId: appointment._id, patientName: appointment.patientId.username }
                        );
                    }
                } catch (error) {
                    console.error(`Error sending reminder for appointment ${appointment._id}:`, error);
                }
            }

            console.log(`Appointment reminders sent for ${appointments.length} appointments`);
        } catch (error) {
            console.error('Error in sendAppointmentReminders:', error);
        }
    }

    // Start all scheduled jobs
    startAllJobs() {
        this.jobs.forEach((job, name) => {
            job.start();
            console.log(`Started job: ${name}`);
        });
    }

    // Stop all scheduled jobs
    stopAllJobs() {
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`Stopped job: ${name}`);
        });
    }

    // Get job status
    getJobStatus() {
        const status = [];
        this.jobs.forEach((job, name) => {
            let nextRun = 'Unknown';
            try {
                // Handle different node-cron versions
                if (typeof job.nextDate === 'function') {
                    nextRun = job.nextDate().toISOString();
                } else if (job.nextInvocation) {
                    nextRun = job.nextInvocation().toISOString();
                }
            } catch (error) {
                nextRun = 'Error getting next run time';
            }
            
            const isRunning = job.running || false;
            status.push({
                name,
                nextRun,
                isRunning,
                cronExpression: this.cronExpressions[name] || 'Unknown'
            });
        });
        return status;
    }

    // Manually trigger daily reminders (for testing)
    async triggerDailyReminders() {
        console.log('Manually triggering daily reminders...');
        try {
            const result = await notificationService.sendDailyReminders();
            return result;
        } catch (error) {
            console.error('Error triggering daily reminders:', error);
            return { success: false, error: error.message };
        }
    }

    // Manually trigger cleanup (for testing)
    async triggerCleanup() {
        console.log('Manually triggering cleanup...');
        try {
            const result = await notificationService.cleanupOldNotifications();
            return result;
        } catch (error) {
            console.error('Error triggering cleanup:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SchedulerService();
