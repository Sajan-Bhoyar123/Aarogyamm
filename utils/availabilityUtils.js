/**
 * Utility functions for managing doctor availability and appointment slots
 */

/**
 * Convert 24-hour format to 12-hour AM/PM format
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30")
 * @returns {string} Time in 12-hour AM/PM format (e.g., "2:30 PM")
 */
function formatTime12Hour(time24) {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Convert 12-hour AM/PM format to 24-hour format
 * @param {string} time12 - Time in 12-hour format (e.g., "2:30 PM")
 * @returns {string} Time in 24-hour format (e.g., "14:30")
 */
function formatTime24Hour(time12) {
    if (!time12) return '';
    
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return time12;
    
    let [_, hours, minutes, period] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get available time slots for a specific date based on doctor's availability
 * @param {Object} doctor - Doctor object with availabilitySlots
 * @param {Date} date - Date to check availability for
 * @returns {Array} Array of available time slots
 */
function getAvailableSlotsForDate(doctor, date) {
    if (!doctor.availabilitySlots || doctor.availabilitySlots.length === 0) {
        return [];
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[date.getDay()];
    
    return doctor.availabilitySlots.filter(slot => 
        slot.day === dayOfWeek && slot.isAvailable
    );
}

/**
 * Check if a specific time slot is available for booking
 * @param {Object} doctor - Doctor object
 * @param {Date} date - Date to check
 * @param {String} timeSlot - Time slot in format "HH:MM-HH:MM"
 * @param {Array} existingAppointments - Array of existing appointments for that date
 * @returns {Boolean} True if slot is available
 */
function isSlotAvailable(doctor, date, timeSlot, existingAppointments = []) {
    const availableSlots = getAvailableSlotsForDate(doctor, date);
    
    if (availableSlots.length === 0) {
        return false;
    }

    // Check if the requested time slot falls within any available slot
    const [requestedStart, requestedEnd] = timeSlot.split('-');
    
    return availableSlots.some(slot => {
        return requestedStart >= slot.startTime && requestedEnd <= slot.endTime;
    });
}

/**
 * Generate all possible appointment slots for a given date
 * @param {Object} doctor - Doctor object
 * @param {Date} date - Date to generate slots for
 * @returns {Array} Array of available appointment slots
 */
function generateAppointmentSlots(doctor, date) {
    const availableSlots = getAvailableSlotsForDate(doctor, date);
    const appointmentSlots = [];
    
    availableSlots.forEach(slot => {
        const startTime = new Date(`2000-01-01T${slot.startTime}`);
        const endTime = new Date(`2000-01-01T${slot.endTime}`);
        const duration = slot.slotDuration || 30; // Default to 30 minutes
        
        let currentTime = new Date(startTime);
        
        while (currentTime < endTime) {
            const slotEnd = new Date(currentTime.getTime() + duration * 60000);
            
            if (slotEnd <= endTime) {
                appointmentSlots.push({
                    startTime: currentTime.toTimeString().slice(0, 5),
                    endTime: slotEnd.toTimeString().slice(0, 5),
                    duration: duration,
                    day: slot.day
                });
            }
            
            currentTime = slotEnd;
        }
    });
    
    return appointmentSlots;
}

/**
 * Check if an appointment date and time has passed
 * @param {Date} appointmentDate - The appointment date
 * @param {string} timeSlot - The time slot (e.g., "09:00-10:00")
 * @returns {boolean} - True if appointment time has passed
 */
function isAppointmentTimePassed(appointmentDate, timeSlot) {
    const now = new Date();
    const appointmentDateTime = new Date(appointmentDate);
    
    // Extract start time from timeSlot (e.g., "09:00-10:00" -> "09:00")
    const startTime = timeSlot.split('-')[0];
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Set the appointment time
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    return now > appointmentDateTime;
}

/**
 * Check if doctor can add medical reports (appointment must be confirmed and time must have passed)
 * @param {Object} appointment - The appointment object
 * @returns {boolean} - True if doctor can add reports
 */
function canDoctorAddReports(appointment) {
    return appointment.status === 'confirmed' && isAppointmentTimePassed(appointment.date, appointment.timeSlot);
}

/**
 * Check if doctor can accept/reject appointment (appointment time must not have passed)
 * @param {Object} appointment - The appointment object
 * @returns {boolean} - True if doctor can accept/reject
 */
function canDoctorAcceptReject(appointment) {
    return appointment.status === 'pending' && !isAppointmentTimePassed(appointment.date, appointment.timeSlot);
}

/**
 * Auto-reject expired appointments that haven't been accepted/rejected
 * @param {Array} appointments - Array of appointment objects
 * @returns {Promise<Array>} - Array of updated appointments
 */
async function autoRejectExpiredAppointments(appointments) {
    const Appointment = require('../models/appointment');
    const updatedAppointments = [];
    
    for (const appointment of appointments) {
        if (appointment.status === 'pending' && isAppointmentTimePassed(appointment.date, appointment.timeSlot)) {
            // Auto-reject the appointment
            appointment.status = 'rejected';
            appointment.statusUpdatedAt = new Date();
            appointment.notes = (appointment.notes || '') + ' [Auto-rejected: Appointment time expired without doctor response]';
            
            // Save to database
            await Appointment.findByIdAndUpdate(appointment._id, {
                status: 'rejected',
                statusUpdatedAt: new Date(),
                notes: appointment.notes
            });
            
            updatedAppointments.push(appointment);
        }
    }
    
    return updatedAppointments;
}

/**
 * Validate appointment date for booking
 * @param {Date} appointmentDate - The appointment date to validate
 * @returns {Object} - Validation result with isValid boolean and message
 */
function validateAppointmentDate(appointmentDate) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(today.getDate() + 7); // 7 days from today
    
    // Reset time to start of day for comparison
    const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    
    if (appointmentDateOnly < today) {
        return {
            isValid: false,
            message: "❌ You CANNOT book a PAST DATE! Please select today or a future date."
        };
    }
    
    if (appointmentDateOnly > oneWeekFromToday) {
        return {
            isValid: false,
            message: "❌ You CANNOT book a date MORE THAN 1 WEEK from today! Please select a date within the next 7 days."
        };
    }
    
    return {
        isValid: true,
        message: "✅ Date is valid for booking!"
    };
}

/**
 * Validate appointment time for same-day bookings
 * @param {Date} appointmentDate - The appointment date
 * @param {string} timeSlot - The time slot (e.g., "09:45-10:15")
 * @returns {Object} - Validation result with isValid boolean and message
 */
function validateAppointmentTime(appointmentDate, timeSlot) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    
    // Only validate time for same-day bookings
    if (appointmentDateOnly.getTime() !== today.getTime()) {
        return {
            isValid: true,
            message: "Time validation not required for future dates."
        };
    }
    
    // Extract start time from timeSlot (e.g., "09:45-10:15" -> "09:45")
    const startTime = timeSlot.split('-')[0];
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create appointment time for comparison
    const appointmentTime = new Date(appointmentDate);
    appointmentTime.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference in minutes
    const timeDifferenceMs = appointmentTime.getTime() - now.getTime();
    const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
    
    // NEW FEATURE: Allow booking ONLY if current time is AT LEAST 30 minutes BEFORE appointment time
    if (timeDifferenceMinutes < 30) {
        return {
            isValid: false,
            message: `❌ You CANNOT book this time slot (${startTime}) because the appointment time is LESS than 30 minutes from now! You can only book today's appointments if the appointment time is AT LEAST 30 minutes from current time.`
        };
    }
    
    return {
        isValid: true,
        message: "✅ Time slot is valid for booking!"
    };
}

/**
 * Get the maximum allowed booking date (1 week from today)
 * @returns {string} - Date in YYYY-MM-DD format
 */
function getMaxBookingDate() {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    return maxDate.toISOString().split('T')[0];
}

/**
 * Get the minimum allowed booking date (today)
 * @returns {string} - Date in YYYY-MM-DD format
 */
function getMinBookingDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// ===============================
// 1. ADD THIS FUNCTION TO YOUR availabilityUtils.js
// ===============================

/**
 * Enhanced time validation with 30-minute buffer for same-day bookings
 */
function validateAppointmentTimeWithBuffer(appointmentDate, timeSlot) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const selectedDate = new Date(appointmentDate);
  selectedDate.setHours(0, 0, 0, 0);
  
  // If not booking for today, no time validation needed
  if (selectedDate.getTime() !== today.getTime()) {
    return { isValid: true };
  }
  
  // For same-day bookings, enforce 30-minute buffer
  const [startTime] = timeSlot.split('-');
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Create appointment datetime
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  // Calculate time difference in minutes
  const timeDifferenceMs = appointmentDateTime.getTime() - now.getTime();
  const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
  
  if (timeDifferenceMinutes < 30) {
    const currentTimeString = now.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    return {
      isValid: false,
      message: `❌ SAME-DAY BOOKING RULE VIOLATION: You need at least 30 minutes between current time and appointment time. Current time: ${currentTimeString}. Selected slot: ${timeSlot}. Please select a slot that starts at least 30 minutes from now.`
    };
  }
  
  return { isValid: true };
}
module.exports = {
    getAvailableSlotsForDate,
    isSlotAvailable,
    generateAppointmentSlots,
    formatTime12Hour,
    formatTime24Hour,
    isAppointmentTimePassed,
    canDoctorAddReports,
    canDoctorAcceptReject,
    autoRejectExpiredAppointments,
    validateAppointmentDate,
    validateAppointmentTime,
    getMaxBookingDate,
    getMinBookingDate,
    validateAppointmentTimeWithBuffer
};


