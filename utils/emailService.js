const nodemailer = require('nodemailer');
const NotificationTemplates = require('./notificationTemplates');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    // Send appointment booking confirmation
    async sendAppointmentBookingEmail(patientEmail, doctorEmail, appointmentData) {
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
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: patientEmail,
                subject: NotificationTemplates.getEmailSubject('appointment_booked', templateData),
                html: NotificationTemplates.getEmailTemplate('appointment_booked_patient', templateData)
            });

            // Send to doctor
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: doctorEmail,
                subject: 'New Appointment Request - Aarogyam',
                html: NotificationTemplates.getEmailTemplate('appointment_booked_doctor', templateData)
            });

            return { success: true, message: 'Appointment booking emails sent successfully' };
        } catch (error) {
            console.error('Error sending appointment booking emails:', error);
            return { success: false, error: error.message };
        }
    }

    // Send appointment status update
    async sendAppointmentStatusEmail(patientEmail, status, appointmentData) {
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

            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: patientEmail,
                subject: NotificationTemplates.getEmailSubject(`appointment_${status}`, templateData),
                html: NotificationTemplates.getEmailTemplate(`appointment_${status}`, templateData)
            });

            return { success: true, message: `Appointment ${status} email sent successfully` };
        } catch (error) {
            console.error(`Error sending appointment ${status} email:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send payment confirmation
    async sendPaymentConfirmationEmail(patientEmail, doctorEmail, paymentData) {
        const subject = 'Payment Confirmation - Aarogyam';
        const html = this.getPaymentConfirmationTemplate(paymentData);

        try {
            // Send to patient
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: patientEmail,
                subject: subject,
                html: html
            });

            // Send to doctor
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: doctorEmail,
                subject: subject,
                html: html
            });

            return { success: true, message: 'Payment confirmation emails sent successfully' };
        } catch (error) {
            console.error('Error sending payment confirmation emails:', error);
            return { success: false, error: error.message };
        }
    }

    // Send prescription/report upload notification
    async sendPrescriptionUploadEmail(patientEmail, doctorName, documentType, documentUrl) {
        const subject = `${documentType} Uploaded - Aarogyam`;
        const html = this.getPrescriptionUploadTemplate(doctorName, documentType, documentUrl);

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: patientEmail,
                subject: subject,
                html: html
            });

            return { success: true, message: `${documentType} upload email sent successfully` };
        } catch (error) {
            console.error(`Error sending ${documentType} upload email:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send welcome email
    async sendWelcomeEmail(email, username, userType) {
        const subject = `Welcome to Aarogyam - ${userType}`;
        const html = this.getWelcomeTemplate(username, userType);

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: subject,
                html: html
            });

            return { success: true, message: 'Welcome email sent successfully' };
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }

    // Send daily appointment reminder
    async sendDailyReminderEmail(email, appointments, userType) {
        const subject = 'Daily Appointment Reminder - Aarogyam';
        const html = this.getDailyReminderTemplate(appointments, userType);

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: subject,
                html: html
            });

            return { success: true, message: 'Daily reminder email sent successfully' };
        } catch (error) {
            console.error('Error sending daily reminder email:', error);
            return { success: false, error: error.message };
        }
    }

    // Email templates
    getAppointmentStatusTemplate(status, appointmentData) {
        const statusColors = {
            'confirmed': '#4CAF50',
            'rejected': '#f44336',
            'cancelled': '#FF9800'
        };

        const statusText = status.charAt(0).toUpperCase() + status.slice(1);

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: ${statusColors[status]}; color: white; padding: 20px; text-align: center;">
                    <h1>Appointment ${statusText}</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Hello ${appointmentData.patientName},</h2>
                    <p>Your appointment with <strong>Dr. ${appointmentData.doctorName}</strong> has been <strong>${statusText}</strong>.</p>
                    
                                         <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                         <h3>Appointment Details:</h3>
                         <p><strong>Date:</strong> ${new Date(appointmentData.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                         <p><strong>Time:</strong> ${appointmentData.timeSlot}</p>
                         <p><strong>Reason:</strong> ${appointmentData.reason}</p>
                         <p><strong>Status:</strong> <span style="color: ${statusColors[status]};">${statusText}</span></p>
                     </div>
                    
                    ${status === 'confirmed' ? '<p>Please arrive 10 minutes before your scheduled time.</p>' : ''}
                    ${status === 'rejected' ? '<p>Please contact us to reschedule or find another available doctor.</p>' : ''}
                    
                                         <div style="text-align: center; margin-top: 30px;">
                         <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/appointments" 
                            style="background-color: ${statusColors[status]}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                             View Appointments
                         </a>
                         <br><br>
                         <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/appointments/upcomingappointments" 
                            style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                             View This Appointment
                         </a>
                     </div>
                </div>
                <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                    <p>&copy; 2024 Aarogyam. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    getPaymentConfirmationTemplate(paymentData) {
        const appointmentInfo = paymentData.appointmentDate && paymentData.timeSlot ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                <h3 style="color: #2e7d32; margin-top: 0;">Appointment Details:</h3>
                <p><strong>Patient Name:</strong> ${paymentData.patientName}</p>
                <p><strong>Appointment Date:</strong> ${new Date(paymentData.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time Slot:</strong> ${paymentData.timeSlot}</p>
                <p><strong>Treatment:</strong> ${paymentData.reason}</p>
            </div>
        ` : '';

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                    <h1>Payment Confirmation</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Payment Successful!</h2>
                    <p>Your payment has been processed successfully.</p>
                    
                    ${appointmentInfo}
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>Payment Details:</h3>
                        <p><strong>Invoice No:</strong> ${paymentData.invoiceNo || 'N/A'}</p>
                        <p><strong>Transaction ID:</strong> ${paymentData.transactionId}</p>
                        <p><strong>Amount:</strong> ₹${paymentData.amount}</p>
                        <p><strong>Payment Date:</strong> ${new Date(paymentData.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>Doctor:</strong> Dr. ${paymentData.doctorName}</p>
                    </div>
                    
                    <p>Thank you for using Aarogyam services!</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/billings" 
                           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            View Billings
                        </a>
                    </div>
                </div>
                <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                    <p>&copy; 2024 Aarogyam. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    getPrescriptionUploadTemplate(doctorName, documentType, documentUrl) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
                    <h1>${documentType} Uploaded</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>New ${documentType} Available</h2>
                    <p>Dr. <strong>${doctorName}</strong> has uploaded a new ${documentType.toLowerCase()} for you.</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>Document Details:</h3>
                        <p><strong>Type:</strong> ${documentType}</p>
                        <p><strong>Uploaded by:</strong> Dr. ${doctorName}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <p>Click the button below to view your ${documentType.toLowerCase()}.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${documentUrl}" 
                           style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            View ${documentType}
                        </a>
                    </div>
                </div>
                <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                    <p>&copy; 2024 Aarogyam. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    getWelcomeTemplate(username, userType) {
        const userTypeText = userType === 'Doctor' ? 'Doctor' : 'Patient';
        const welcomeMessage = userType === 'Doctor' 
            ? 'Welcome to our healthcare platform! You can now manage your appointments, view patient records, and provide quality healthcare services.'
            : 'Welcome to our healthcare platform! You can now book appointments with qualified doctors, manage your health records, and receive quality healthcare.';

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                    <h1>Welcome to Aarogyam!</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Hello ${username},</h2>
                    <p>Welcome to Aarogyam, your trusted healthcare management platform!</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>Welcome ${userTypeText}!</h3>
                        <p>${welcomeMessage}</p>
                        
                        <h4>What you can do now:</h4>
                        <ul style="text-align: left;">
                            ${userType === 'Doctor' 
                                ? '<li>Set your availability and consultation hours</li><li>View and manage appointment requests</li><li>Add patient records and prescriptions</li><li>Manage your patient list</li>'
                                : '<li>Browse and book appointments with doctors</li><li>View your appointment history</li><li>Access your health records and prescriptions</li><li>Manage your medical information</li>'
                            }
                        </ul>
                    </div>
                    
                    <p>We\'re excited to have you on board and look forward to providing you with excellent healthcare services.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/${userType.toLowerCase()}/dashboard" 
                           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            Go to Dashboard
                        </a>
                    </div>
                </div>
                <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                    <p>&copy; 2024 Aarogyam. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    getDailyReminderTemplate(appointments, userType) {
        const appointmentList = appointments.map(apt => `
            <div style="border-left: 4px solid #4CAF50; padding-left: 15px; margin: 10px 0;">
                <p><strong>Time:</strong> ${apt.timeSlot}</p>
                <p><strong>Patient:</strong> ${apt.patientName}</p>
                <p><strong>Reason:</strong> ${apt.reason}</p>
            </div>
        `).join('');

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center;">
                    <h1>Daily Appointment Reminder</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Good morning!</h2>
                    <p>Here are your appointments for today:</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        ${appointments.length > 0 ? appointmentList : '<p>No appointments scheduled for today.</p>'}
                    </div>
                    
                    <p>Please review your schedule and prepare accordingly.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/${userType === 'doctor' ? 'doctor' : 'patient'}/appointments" 
                           style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            View Appointments
                        </a>
                    </div>
                </div>
                <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                    <p>&copy; 2024 Aarogyam. All rights reserved.</p>
                </div>
            </div>
        `;
    }
}

module.exports = new EmailService();
