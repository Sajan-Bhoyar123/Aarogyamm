/**
 * Utility functions for managing doctor availability and appointment slots
 */

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

module.exports = {
    getAvailableSlotsForDate,
    isSlotAvailable,
    generateAppointmentSlots
};


