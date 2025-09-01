// Enhanced notification templates for better user experience
class NotificationTemplates {
    
    // SMS Templates with null safety
    static getSMSTemplate(type, data) {
        // Ensure data object exists and has safe fallbacks
        const safeData = {
            patientName: data?.patientName || 'Patient',
            doctorName: data?.doctorName || 'Doctor',
            formattedDate: data?.formattedDate || 'Date TBD',
            timeSlot: data?.timeSlot || 'Time TBD',
            reason: data?.reason || 'General consultation',
            amount: data?.amount || '0',
            transactionId: data?.transactionId || 'N/A',
            documentType: data?.documentType || 'document',
            username: data?.username || 'User',
            message: data?.message || 'Notification'
        };

        const templates = {
            appointment_booked_patient: `Hi ${safeData.patientName}! Your appointment with Dr. ${safeData.doctorName} is booked for ${safeData.formattedDate} at ${safeData.timeSlot}. Reason: ${safeData.reason}. Status: Pending confirmation. - Aarogyam`,
            
            appointment_booked_doctor: `New appointment request from ${safeData.patientName} for ${safeData.formattedDate} at ${safeData.timeSlot}. Reason: ${safeData.reason}. Please review in your dashboard. - Aarogyam`,
            
            appointment_confirmed: `Great news! Dr. ${safeData.doctorName} confirmed your appointment for ${safeData.formattedDate} at ${safeData.timeSlot}. Please arrive 10 minutes early. - Aarogyam`,
            
            appointment_rejected: `Your appointment with Dr. ${safeData.doctorName} for ${safeData.formattedDate} at ${safeData.timeSlot} has been declined. Please book another slot. - Aarogyam`,
            
            appointment_cancelled: `Your appointment with Dr. ${safeData.doctorName} for ${safeData.formattedDate} at ${safeData.timeSlot} has been cancelled. Contact us for rescheduling. - Aarogyam`,
            
            payment_confirmed_patient: `Payment successful! ₹${safeData.amount} paid to Dr. ${safeData.doctorName} for ${safeData.appointmentDate ? new Date(safeData.appointmentDate).toLocaleDateString() : 'consultation'} ${safeData.timeSlot ? 'at ' + safeData.timeSlot : ''}. Transaction ID: ${safeData.transactionId}. Thank you! - Aarogyam`,
            
            payment_confirmed_doctor: `Payment received: ₹${safeData.amount} from ${safeData.patientName} for ${safeData.appointmentDate ? new Date(safeData.appointmentDate).toLocaleDateString() : 'consultation'} ${safeData.timeSlot ? 'at ' + safeData.timeSlot : ''}. Transaction ID: ${safeData.transactionId}. - Aarogyam`,
            
            prescription_uploaded: `Dr. ${safeData.doctorName} uploaded your ${safeData.documentType.toLowerCase()}. Check your email or login to view it. - Aarogyam`,
            
            appointment_reminder: `Reminder: Appointment with Dr. ${safeData.doctorName} tomorrow at ${safeData.timeSlot}. Please arrive 10 minutes early. - Aarogyam`,
            
            welcome_patient: `Welcome ${safeData.username} to Aarogyam! You're registered as a Patient. Book appointments with qualified doctors. - Aarogyam`,
            
            welcome_doctor: `Welcome Dr. ${safeData.username} to Aarogyam! You're registered as a Doctor. Manage appointments and help patients. - Aarogyam`
        };
        
        return templates[type] || `Notification from Aarogyam - ${safeData.message}`;
    }
    
    // Email Subject Templates
    static getEmailSubject(type, data) {
        const subjects = {
            appointment_booked: 'Appointment Booking Confirmation - Aarogyam',
            appointment_confirmed: 'Appointment Confirmed - Aarogyam',
            appointment_rejected: 'Appointment Update - Aarogyam',
            appointment_cancelled: 'Appointment Cancelled - Aarogyam',
            payment_confirmation: 'Payment Confirmation - Aarogyam',
            prescription_uploaded: `${data.documentType} Uploaded - Aarogyam`,
            welcome: `Welcome to Aarogyam - ${data.userType}`,
            daily_reminder: 'Daily Appointment Reminder - Aarogyam',
            appointment_reminder: 'Appointment Reminder - Aarogyam'
        };
        
        return subjects[type] || 'Notification from Aarogyam';
    }
    
    // Enhanced email templates with better styling
    static getEmailTemplate(type, data) {
        const baseStyle = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        `;
        
        const headerStyle = (color, title) => `
            <div style="background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${title}</h1>
            </div>
        `;
        
        const contentStyle = `
            <div style="padding: 30px 20px; background-color: #f8f9fa;">
        `;
        
        const footerStyle = `
            </div>
            <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 14px;">&copy; 2024 Aarogyam Healthcare Platform. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">Your trusted healthcare management solution</p>
            </div>
            </div>
        `;
        
        const templates = {
            appointment_booked_patient: baseStyle + headerStyle('#4CAF50', 'Appointment Booked Successfully!') + contentStyle + `
                <h2 style="color: #2c3e50; margin-bottom: 20px;">Hello ${data.patientName},</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">Your appointment has been successfully booked with <strong>Dr. ${data.doctorName}</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #2c3e50; margin-top: 0;">📅 Appointment Details:</h3>
                    <p><strong>Date:</strong> ${data.formattedDate}</p>
                    <p><strong>Time:</strong> ${data.timeSlot}</p>
                    <p><strong>Reason:</strong> ${data.reason}</p>
                    <p><strong>Status:</strong> <span style="color: #FF9800; font-weight: bold;">⏳ Pending Confirmation</span></p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #555;">You will receive a notification once Dr. ${data.doctorName} confirms your appointment.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/appointments" 
                       style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; transition: all 0.3s;">
                        📋 View My Appointments
                    </a>
                </div>
            ` + footerStyle,
            
            appointment_confirmed: baseStyle + headerStyle('#4CAF50', 'Appointment Confirmed! 🎉') + contentStyle + `
                <h2 style="color: #2c3e50; margin-bottom: 20px;">Great news, ${data.patientName}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">Dr. <strong>${data.doctorName}</strong> has confirmed your appointment.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #2c3e50; margin-top: 0;">📅 Confirmed Appointment:</h3>
                    <p><strong>Date:</strong> ${data.formattedDate}</p>
                    <p><strong>Time:</strong> ${data.timeSlot}</p>
                    <p><strong>Reason:</strong> ${data.reason}</p>
                    <p><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">✅ Confirmed</span></p>
                </div>
                
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2e7d32;"><strong>📝 Important:</strong> Please arrive 10 minutes before your scheduled time.</p>
                </div>
            ` + footerStyle,
            
            appointment_rejected: baseStyle + headerStyle('#f44336', 'Appointment Update') + contentStyle + `
                <h2 style="color: #2c3e50; margin-bottom: 20px;">Hello ${data.patientName},</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">We regret to inform you that your appointment with <strong>Dr. ${data.doctorName}</strong> has been declined.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
                    <h3 style="color: #2c3e50; margin-top: 0;">📅 Declined Appointment:</h3>
                    <p><strong>Date:</strong> ${data.formattedDate}</p>
                    <p><strong>Time:</strong> ${data.timeSlot}</p>
                    <p><strong>Reason:</strong> ${data.reason}</p>
                    <p><strong>Status:</strong> <span style="color: #f44336; font-weight: bold;">❌ Rejected</span></p>
                </div>
                
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #e65100;"><strong>📝 Next Steps:</strong> Please book another available time slot that works for you.</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/bookappointment/${data.doctorId}" 
                       style="background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; transition: all 0.3s;">
                        📅 Book New Appointment
                    </a>
                </div>
            ` + footerStyle
        };
        
        return templates[type] || this.getDefaultEmailTemplate(data);
    }
    
    static getDefaultEmailTemplate(data) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
                    <h1>Aarogyam Notification</h1>
                </div>
                <div style="padding: 20px;">
                    <p>${data.message}</p>
                </div>
                <div style="background: #333; color: white; padding: 20px; text-align: center;">
                    <p>&copy; 2024 Aarogyam. All rights reserved.</p>
                </div>
            </div>
        `;
    }
}

module.exports = NotificationTemplates;
