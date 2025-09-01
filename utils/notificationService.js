const Notification = require('../models/notification');
const emailService = require('./emailService');
const smsService = require('./smsService');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');

class NotificationService {
    constructor() {
        this.emailService = emailService;
        this.smsService = smsService;
    }

    // Create notification record in database
    async createNotification(recipientId, recipientModel, type, title, message, data = {}) {
        try {
            const notification = new Notification({
                recipient: recipientId,
                recipientModel: recipientModel,
                type: type,
                title: title,
                message: message,
                data: data
            });

            await notification.save();
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    // Send welcome notifications for new users
    async sendWelcomeNotifications(userId, userType, email, phone, username) {
        try {
            // Create welcome notification in database
            await this.createNotification(
                userId,
                userType,
                'welcome',
                'Welcome to Aarogyam!',
                `Welcome ${username}! Thank you for joining Aarogyam healthcare platform.`,
                { userType, username }
            );

            // Send welcome email
            const emailResult = await this.emailService.sendWelcomeEmail(email, username, userType);

            // Send welcome SMS (if phone exists)
            let smsResult = { success: true };
            if (phone) {
                smsResult = await this.smsService.sendWelcomeSMS(phone, username, userType);
            }

            // Update notification record
            if (emailResult.success) {
                await Notification.updateOne(
                    { recipient: userId, type: 'welcome' },
                    { 
                        emailSent: true,
                        emailSentAt: new Date()
                    }
                );
            }

            if (smsResult.success && phone) {
                await Notification.updateOne(
                    { recipient: userId, type: 'welcome' },
                    { 
                        smsSent: true,
                        smsSentAt: new Date()
                    }
                );
            }

            return { success: true, message: 'Welcome notifications sent successfully' };
        } catch (error) {
            console.error('Error sending welcome notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send appointment booking notifications
    async sendAppointmentBookingNotifications(appointmentId, patientId, doctorId) {
        try {
            // Get patient and doctor details
            const patient = await Patient.findById(patientId);
            const doctor = await Doctor.findById(doctorId);

            if (!patient || !doctor) {
                throw new Error('Patient or doctor not found');
            }

            // Get actual appointment details
            const Appointment = require('../models/appointment');
            const appointment = await Appointment.findById(appointmentId);
            
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const appointmentData = {
                patientName: patient.username,
                doctorName: doctor.username,
                date: appointment.date,
                timeSlot: appointment.timeSlot,
                reason: appointment.reason || 'General consultation',
                appointmentId: appointment._id
            };

            // Create notifications in database
            await this.createNotification(
                patientId,
                'Patient',
                'appointment_booked',
                'Appointment Booked',
                `Your appointment with Dr. ${doctor.username} has been booked successfully.`,
                { appointmentId, doctorName: doctor.username }
            );

            await this.createNotification(
                doctorId,
                'Doctor',
                'appointment_booked',
                'New Appointment Request',
                `New appointment request from ${patient.username}.`,
                { appointmentId, patientName: patient.username }
            );

            // Send emails
            const emailResult = await this.emailService.sendAppointmentBookingEmail(
                patient.email,
                doctor.email,
                appointmentData
            );

            // Send SMS (if phone numbers exist)
            let smsResult = { success: true };
            if (patient.phone && doctor.phone) {
                smsResult = await this.smsService.sendAppointmentBookingSMS(
                    patient.phone,
                    doctor.phone,
                    appointmentData
                );
            }

            // Update notification records
            if (emailResult.success) {
                await Notification.updateMany(
                    { 
                        recipient: { $in: [patientId, doctorId] },
                        type: 'appointment_booked'
                    },
                    { 
                        emailSent: true,
                        emailSentAt: new Date()
                    }
                );
            }

            if (smsResult.success && patient.phone && doctor.phone) {
                await Notification.updateMany(
                    { 
                        recipient: { $in: [patientId, doctorId] },
                        type: 'appointment_booked'
                    },
                    { 
                        smsSent: true,
                        smsSentAt: new Date()
                    }
                );
            }

            return {
                success: true,
                email: emailResult,
                sms: smsResult,
                message: 'Appointment booking notifications sent successfully'
            };

        } catch (error) {
            console.error('Error sending appointment booking notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send appointment status update notifications
    async sendAppointmentStatusNotifications(appointmentId, patientId, doctorId, status) {
        try {
            const patient = await Patient.findById(patientId);
            const doctor = await Doctor.findById(doctorId);

            if (!patient || !doctor) {
                throw new Error('Patient or doctor not found');
            }

            // Get actual appointment details
            const Appointment = require('../models/appointment');
            const appointment = await Appointment.findById(appointmentId);
            
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const appointmentData = {
                patientName: patient.username,
                doctorName: doctor.username,
                date: appointment.date,
                timeSlot: appointment.timeSlot,
                reason: appointment.reason || 'General consultation',
                appointmentId: appointment._id
            };

            const statusText = status.charAt(0).toUpperCase() + status.slice(1);

            // Create notification in database
            await this.createNotification(
                patientId,
                'Patient',
                `appointment_${status}`,
                `Appointment ${statusText}`,
                `Your appointment with Dr. ${doctor.username} has been ${statusText}.`,
                { appointmentId, doctorName: doctor.username, status }
            );

            // Send email
            const emailResult = await this.emailService.sendAppointmentStatusEmail(
                patient.email,
                status,
                appointmentData
            );

            // Send SMS (if phone number exists)
            let smsResult = { success: true };
            if (patient.phone) {
                smsResult = await this.smsService.sendAppointmentStatusSMS(
                    patient.phone,
                    status,
                    appointmentData
                );
            }

            // Update notification record
            if (emailResult.success) {
                await Notification.updateOne(
                    { 
                        recipient: patientId,
                        type: `appointment_${status}`
                    },
                    { 
                        emailSent: true,
                        emailSentAt: new Date()
                    }
                );
            }

            if (smsResult.success && patient.phone) {
                await Notification.updateOne(
                    { 
                        recipient: patientId,
                        type: `appointment_${status}`
                    },
                    { 
                        smsSent: true,
                        smsSentAt: new Date()
                    }
                );
            }

            return {
                success: true,
                email: emailResult,
                sms: smsResult,
                message: `Appointment ${status} notifications sent successfully`
            };

        } catch (error) {
            console.error('Error sending appointment status notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send payment confirmation notifications
    async sendPaymentConfirmationNotifications(paymentId, patientId, doctorId, paymentData) {
        try {
            const patient = await Patient.findById(patientId);
            const doctor = await Doctor.findById(doctorId);

            if (!patient || !doctor) {
                throw new Error('Patient or doctor not found');
            }

            // Get actual payment details
            const Billing = require('../models/billing');
            const billing = await Billing.findById(paymentId);
            
            if (!billing) {
                throw new Error('Billing record not found');
            }

            // Update payment data with real information
            const realPaymentData = {
                transactionId: paymentData.transactionId,
                amount: billing.amount,
                date: new Date(),
                doctorName: doctor.username,
                patientName: patient.username,
                appointmentId: billing.appointmentId || null
            };

            // Create notifications in database
            await this.createNotification(
                patientId,
                'Patient',
                'payment_confirmation',
                'Payment Confirmed',
                `Your payment of ₹${realPaymentData.amount} has been confirmed successfully.`,
                { paymentId, amount: realPaymentData.amount, doctorName: doctor.username }
            );

            await this.createNotification(
                doctorId,
                'Doctor',
                'payment_confirmation',
                'Payment Received',
                `Payment of ₹${realPaymentData.amount} received from ${patient.username}.`,
                { paymentId, amount: realPaymentData.amount, patientName: patient.username }
            );

            // Send emails
            const emailResult = await this.emailService.sendPaymentConfirmationEmail(
                patient.email,
                doctor.email,
                realPaymentData
            );

            // Send SMS (if phone numbers exist)
            let smsResult = { success: true };
            if (patient.phone && doctor.phone) {
                smsResult = await this.smsService.sendPaymentConfirmationSMS(
                    patient.phone,
                    doctor.phone,
                    realPaymentData
                );
            }

            // Update notification records
            if (emailResult.success) {
                await Notification.updateMany(
                    { 
                        recipient: { $in: [patientId, doctorId] },
                        type: 'payment_confirmation'
                    },
                    { 
                        emailSent: true,
                        emailSentAt: new Date()
                    }
                );
            }

            if (smsResult.success && patient.phone && doctor.phone) {
                await Notification.updateMany(
                    { 
                        recipient: { $in: [patientId, doctorId] },
                        type: 'payment_confirmation'
                    },
                    { 
                        smsSent: true,
                        smsSentAt: new Date()
                    }
                );
            }

            return {
                success: true,
                email: emailResult,
                sms: smsResult,
                message: 'Payment confirmation notifications sent successfully'
            };

        } catch (error) {
            console.error('Error sending payment confirmation notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send prescription/report upload notifications
    async sendPrescriptionUploadNotifications(patientId, doctorId, documentType, documentUrl) {
        try {
            const patient = await Patient.findById(patientId);
            const doctor = await Doctor.findById(doctorId);

            if (!patient || !doctor) {
                throw new Error('Patient or doctor not found');
            }

            // Create notification in database
            await this.createNotification(
                patientId,
                'Patient',
                `${documentType.toLowerCase()}_uploaded`,
                `${documentType} Uploaded`,
                `Dr. ${doctor.username} has uploaded a new ${documentType.toLowerCase()} for you.`,
                { doctorName: doctor.username, documentType, documentUrl }
            );

            // Send email
            const emailResult = await this.emailService.sendPrescriptionUploadEmail(
                patient.email,
                doctor.username,
                documentType,
                documentUrl
            );

            // Send SMS (if phone number exists)
            let smsResult = { success: true };
            if (patient.phone) {
                smsResult = await this.smsService.sendPrescriptionUploadSMS(
                    patient.phone,
                    doctor.username,
                    documentType
                );
            }

            // Update notification record
            if (emailResult.success) {
                await Notification.updateOne(
                    { 
                        recipient: patientId,
                        type: `${documentType.toLowerCase()}_uploaded`
                    },
                    { 
                        emailSent: true,
                        emailSentAt: new Date()
                    }
                );
            }

            if (smsResult.success && patient.phone) {
                await Notification.updateOne(
                    { 
                        recipient: patientId,
                        type: `${documentType.toLowerCase()}_uploaded`
                    },
                    { 
                        smsSent: true,
                        smsSentAt: new Date()
                    }
                );
            }

            return {
                success: true,
                email: emailResult,
                sms: smsResult,
                message: `${documentType} upload notifications sent successfully`
            };

        } catch (error) {
            console.error('Error sending prescription upload notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send daily appointment reminders
    async sendDailyReminders() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get all patients with appointments today
            const patients = await Patient.find({
                appointments: { $exists: true, $ne: [] }
            }).populate('appointments');

            // Get all doctors with appointments today
            const doctors = await Doctor.find({
                appointments: { $exists: true, $ne: [] }
            }).populate('appointments');

            let totalSent = 0;

            // Send reminders to patients
            for (const patient of patients) {
                const todaysAppointments = patient.appointments.filter(apt => {
                    const aptDate = new Date(apt.date);
                    return aptDate >= today && aptDate < tomorrow && apt.status === 'confirmed';
                });

                if (todaysAppointments.length > 0) {
                    // Create notification
                    await this.createNotification(
                        patient._id,
                        'Patient',
                        'daily_reminder',
                        'Daily Appointment Reminder',
                        `You have ${todaysAppointments.length} appointment(s) today.`,
                        { appointments: todaysAppointments }
                    );

                    // Send email
                    await this.emailService.sendDailyReminderEmail(
                        patient.email,
                        todaysAppointments,
                        'patient'
                    );

                    // Send SMS (if phone number exists)
                    if (patient.phone) {
                        await this.smsService.sendDailyReminderSMS(
                            patient.phone,
                            todaysAppointments,
                            patient.username,
                            'patient'
                        );
                    }

                    totalSent++;
                }
            }

            // Send reminders to doctors
            for (const doctor of doctors) {
                const todaysAppointments = doctor.appointments.filter(apt => {
                    const aptDate = new Date(apt.date);
                    return aptDate >= today && aptDate < tomorrow && apt.status === 'confirmed';
                });

                if (todaysAppointments.length > 0) {
                    // Create notification
                    await this.createNotification(
                        doctor._id,
                        'Doctor',
                        'daily_reminder',
                        'Daily Appointment Reminder',
                        `You have ${todaysAppointments.length} appointment(s) today.`,
                        { appointments: todaysAppointments }
                    );

                    // Send email
                    await this.emailService.sendDailyReminderEmail(
                        doctor.email,
                        todaysAppointments,
                        'doctor'
                    );

                    // Send SMS (if phone number exists)
                    if (doctor.phone) {
                        await this.smsService.sendDailyReminderSMS(
                            doctor.phone,
                            todaysAppointments,
                            doctor.username,
                            'doctor'
                        );
                    }

                    totalSent++;
                }
            }

            return {
                success: true,
                message: `Daily reminders sent to ${totalSent} users successfully`
            };

        } catch (error) {
            console.error('Error sending daily reminders:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user notifications
    async getUserNotifications(userId, userType, limit = 20, page = 1) {
        try {
            const skip = (page - 1) * limit;
            
            const notifications = await Notification.find({
                recipient: userId,
                recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

            const total = await Notification.countDocuments({
                recipient: userId,
                recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient'
            });

            return {
                success: true,
                notifications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalNotifications: total,
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            console.error('Error getting user notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark notification as read
    async markNotificationAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndUpdate(
                {
                    _id: notificationId,
                    recipient: userId
                },
                {
                    read: true,
                    readAt: new Date()
                },
                { new: true }
            );

            if (!notification) {
                return { success: false, error: 'Notification not found' };
            }

            return { success: true, notification };

        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark all notifications as read
    async markAllNotificationsAsRead(userId, userType) {
        try {
            const result = await Notification.updateMany(
                {
                    recipient: userId,
                    recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient',
                    read: false
                },
                {
                    read: true,
                    readAt: new Date()
                }
            );

            return {
                success: true,
                message: `${result.modifiedCount} notifications marked as read`
            };

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete old notifications (older than 30 days)
    async cleanupOldNotifications() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const result = await Notification.deleteMany({
                createdAt: { $lt: thirtyDaysAgo },
                read: true
            });

            return {
                success: true,
                message: `${result.deletedCount} old notifications cleaned up`
            };

        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new NotificationService();
