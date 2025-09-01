const twilio = require('twilio');
const NotificationTemplates = require('./notificationTemplates');

class SMSService {
    constructor() {
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    }

    // Send appointment booking SMS
    async sendAppointmentBookingSMS(patientPhone, doctorPhone, appointmentData) {
        try {
            // Format date properly
            const appointmentDate = new Date(appointmentData.date);
            const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const templateData = { ...appointmentData, formattedDate };

            // Send to patient
            const patientMessage = NotificationTemplates.getSMSTemplate('appointment_booked_patient', templateData);
            
            await this.client.messages.create({
                body: patientMessage,
                from: this.fromNumber,
                to: patientPhone
            });

            // Send to doctor
            const doctorMessage = NotificationTemplates.getSMSTemplate('appointment_booked_doctor', templateData);
            
            await this.client.messages.create({
                body: doctorMessage,
                from: this.fromNumber,
                to: doctorPhone
            });

            return { success: true, message: 'Appointment booking SMS sent successfully' };
        } catch (error) {
            console.error('Error sending appointment booking SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Send appointment status update SMS
    async sendAppointmentStatusSMS(patientPhone, status, appointmentData) {
        try {
            // Format date properly
            const appointmentDate = new Date(appointmentData.date);
            const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const templateData = { ...appointmentData, formattedDate };
            const message = NotificationTemplates.getSMSTemplate(`appointment_${status}`, templateData);

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: patientPhone
            });

            return { success: true, message: `Appointment ${status} SMS sent successfully` };
        } catch (error) {
            console.error(`Error sending appointment ${status} SMS:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send payment confirmation SMS
    async sendPaymentConfirmationSMS(patientPhone, doctorPhone, paymentData) {
        try {
            // Format date properly
            const paymentDate = new Date(paymentData.date);
            const formattedDate = paymentDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const patientMessage = `Payment confirmed! Transaction ID: ${paymentData.transactionId}, Amount: ₹${paymentData.amount}, Doctor: Dr. ${paymentData.doctorName}, Date: ${formattedDate}. Thank you for using Aarogyam!`;

            // Send to patient
            await this.client.messages.create({
                body: patientMessage,
                from: this.fromNumber,
                to: patientPhone
            });

            // Send to doctor
            const doctorMessage = `Payment received from ${paymentData.patientName} for ₹${paymentData.amount}. Transaction ID: ${paymentData.transactionId}, Date: ${formattedDate}. - Aarogyam`;
            
            await this.client.messages.create({
                body: doctorMessage,
                from: this.fromNumber,
                to: doctorPhone
            });

            return { success: true, message: 'Payment confirmation SMS sent successfully' };
        } catch (error) {
            console.error('Error sending payment confirmation SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Send welcome SMS
    async sendWelcomeSMS(phone, username, userType) {
        try {
            const userTypeText = userType === 'Doctor' ? 'Doctor' : 'Patient';
            const message = `Welcome ${username} to Aarogyam! You're now registered as a ${userTypeText}. Thank you for choosing our healthcare platform. - Aarogyam`;

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phone
            });

            return { success: true, message: 'Welcome SMS sent successfully' };
        } catch (error) {
            console.error('Error sending welcome SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Send prescription/report upload notification SMS
    async sendPrescriptionUploadSMS(patientPhone, doctorName, documentType) {
        try {
            const message = `Hi! Dr. ${doctorName} has uploaded a new ${documentType.toLowerCase()} for you. Please check your email or login to Aarogyam to view it. - Aarogyam`;

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: patientPhone
            });

            return { success: true, message: `${documentType} upload SMS sent successfully` };
        } catch (error) {
            console.error(`Error sending ${documentType} upload SMS:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send appointment reminder SMS
    async sendAppointmentReminderSMS(phone, appointmentData) {
        try {
            const message = `Reminder: You have an appointment with ${appointmentData.doctorName} tomorrow at ${appointmentData.timeSlot}. Please arrive 10 minutes early. - Aarogyam`;

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phone
            });

            return { success: true, message: 'Appointment reminder SMS sent successfully' };
        } catch (error) {
            console.error('Error sending appointment reminder SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Send daily appointment reminder SMS
    async sendDailyReminderSMS(phone, appointments, userName, userType) {
        try {
            let message = `Good morning ${userName}! `;
            
            if (appointments.length > 0) {
                message += `You have ${appointments.length} appointment(s) today: `;
                appointments.forEach((apt, index) => {
                    if (index < 3) { // Limit to first 3 appointments in SMS
                        message += `${apt.timeSlot}${userType === 'doctor' ? ` - ${apt.patientName}` : ''}, `;
                    }
                });
                message = message.slice(0, -2); // Remove last comma and space
            } else {
                message += 'No appointments scheduled for today.';
            }
            
            message += ' - Aarogyam';

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phone
            });

            return { success: true, message: 'Daily reminder SMS sent successfully' };
        } catch (error) {
            console.error('Error sending daily reminder SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Send emergency/critical notification SMS
    async sendEmergencySMS(phone, message) {
        try {
            const emergencyMessage = `URGENT: ${message} - Aarogyam`;

            await this.client.messages.create({
                body: emergencyMessage,
                from: this.fromNumber,
                to: phone
            });

            return { success: true, message: 'Emergency SMS sent successfully' };
        } catch (error) {
            console.error('Error sending emergency SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Send appointment reminder SMS (24 hours before)
    async sendAppointmentReminderSMS(phone, appointmentData) {
        try {
            const message = `Reminder: You have an appointment with Dr. ${appointmentData.doctorName} tomorrow at ${appointmentData.timeSlot}. Please arrive 10 minutes early. - Aarogyam`;

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phone
            });

            return { success: true, message: 'Appointment reminder SMS sent successfully' };
        } catch (error) {
            console.error('Error sending appointment reminder SMS:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SMSService();
