const fs = require("fs");
const path = require("path");

const Doctor = require("../models/doctor");
const Patient = require("../models/patient");
const Appointment = require("../models/appointment");
const HealthRecord = require("../models/healthrecord");
const Billing = require("../models/billing");
const { isSlotAvailable } = require("../utils/availabilityUtils");
const { generateAppointmentSlots } = require("../utils/availabilityUtils");
const { validateAppointmentDate, validateAppointmentTime, validateAppointmentTimeWithBuffer } = require("../utils/availabilityUtils");
const { appointmentSchema } = require('../schema');
const ExpressError = require("../utils/ExpressError");
const notificationService = require("../utils/notificationService");

/**
 * Render the patient's dashboard.
 */
module.exports.dashboard = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user._id);
    if (!patient) {
      req.flash("danger", "Patient not found.");
      return res.redirect("/auth/login");
    }
    res.render("patient/dashboard", { patient });
  } catch (err) {
    console.error("Error fetching patient data:", err);
    req.flash("danger", "Internal Server Error.");
    res.redirect("/auth/login");
  }
};

/**
 * Render upcoming appointments.
 */
module.exports.upcomingAppointments = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0); // Start of next day

    const appointments = await Appointment.find({
      patientId,
      date: { $gte: tomorrow }
    })
      .populate("patientId")
      .populate("doctorId");
    
    // Add utility functions to handle auto-rejection
    const { autoRejectExpiredAppointments } = require("../utils/availabilityUtils");
    
    // Auto-reject expired appointments
    const updatedAppointments = await autoRejectExpiredAppointments(appointments);
    
    // If any appointments were auto-rejected, show a message
    if (updatedAppointments.length > 0) {
      req.flash("info", `${updatedAppointments.length} expired appointment(s) have been automatically rejected by the system.`);
    }
    
    // Fetch updated appointments after auto-rejection
    const updatedAppointmentsList = await Appointment.find({
      patientId,
      date: { $gte: tomorrow }
    })
      .populate("patientId")
      .populate("doctorId");
    
    const patient = await Patient.findById(patientId);
    res.render("patient/appointments/upcomingappointments", { 
      appointments: updatedAppointmentsList, 
      patient 
    });
  } catch (err) {
    console.error("Error fetching upcoming appointments:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Render today's appointments.
 */
module.exports.todaysAppointments = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      patientId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patientId")
      .populate("doctorId");
    const patient = await Patient.findById(patientId);
    res.render("patient/appointments/todaysappointments", { appointments,patient });
  } catch (err) {
    console.error("Error fetching today's appointments:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Render past appointments.
 */
module.exports.pastAppointments = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const appointments = await Appointment.find({
      patientId,
      date: { $lt: today }
    })
      .populate("patientId")
      .populate("doctorId");
    
    // Add utility functions to handle auto-rejection
    const { autoRejectExpiredAppointments } = require("../utils/availabilityUtils");
    
    // Auto-reject expired appointments
    const updatedAppointments = await autoRejectExpiredAppointments(appointments);
    
    // If any appointments were auto-rejected, show a message
    if (updatedAppointments.length > 0) {
      req.flash("info", `${updatedAppointments.length} expired appointment(s) have been automatically rejected by the system.`);
    }
    
    // Fetch updated appointments after auto-rejection
    const updatedAppointmentsList = await Appointment.find({
      patientId,
      date: { $lt: today }
    })
      .populate("patientId")
      .populate("doctorId");
    
    const patient = await Patient.findById(patientId);
    res.render("patient/appointments/pastappointments", { 
      appointments: updatedAppointmentsList, 
      patient 
    });
  } catch (err) {
    console.error("Error fetching past appointments:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Cancel an appointment.
 * This function is used for upcoming, today's, and past appointments.
 */
module.exports.cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      const referer = req.get("referer") || "/patient/dashboard";
      return res.redirect(referer);
    }

    // Send cancellation notifications before deleting
    try {
      await notificationService.sendAppointmentStatusNotifications(
        appointment._id,
        appointment.patientId,
        appointment.doctorId,
        'cancelled'
      );
      console.log('Appointment cancellation notification sent successfully');
    } catch (notificationError) {
      console.error('Error sending cancellation notification:', notificationError);
      // Don't fail the cancellation if notifications fail
    }

    await Appointment.findByIdAndDelete(id);
    req.flash("success", "Appointment canceled successfully!");
    // Determine the referer to redirect appropriately.
    const referer = req.get("referer") || "/patient/dashboard";
    res.redirect(referer);
  } catch (error) {
    console.error("Error canceling appointment:", error);
    req.flash("error", "Internal Server Error.");
    const referer = req.get("referer") || "/patient/dashboard";
    res.redirect(referer);
  }
};

/**
 * Filter appointments based on query parameters.
 */
module.exports.filterAppointments = async (req, res, next) => {
  try {
    let patientId = req.user._id;
    const patient = await Patient.findById(patientId);
    const { search, date, status, timeSlot } = req.query;
    
    // Base filter with patient ID
    let filter = { patientId };

    // Add specific filters
    if (date) filter.date = date;
    if (status) filter.status = status;
    if (timeSlot) filter.timeSlot = timeSlot;

    // Determine which page we're filtering for based on referer
    const referer = req.get("referer");
    let appointments;

    if (referer && referer.includes("/pastappointments")) {
      // Filter past appointments (before today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.date = { ...filter.date, $lt: today };
      
      appointments = await Appointment.find(filter).populate("doctorId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          appointment.doctorId.username.toLowerCase().includes(search.toLowerCase()) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("patient/appointments/pastappointments", { appointments, patient });
      
    } else if (referer && referer.includes("/upcomingappointments")) {
      // Filter upcoming appointments (from tomorrow onwards)
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0); // Start of today
      filter.date = { ...filter.date, $gte: tomorrow };
      
      appointments = await Appointment.find(filter).populate("doctorId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          appointment.doctorId.username.toLowerCase().includes(search.toLowerCase()) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("patient/appointments/upcomingappointments", { appointments, patient });
      
    } else {
      // Filter today's appointments
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      filter.date = { 
        ...filter.date, 
        $gte: startOfDay, 
        $lte: endOfDay 
      };
      
      appointments = await Appointment.find(filter).populate("doctorId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          appointment.doctorId.username.toLowerCase().includes(search.toLowerCase()) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("patient/appointments/todaysappointments", { appointments, patient });
    }
  } catch (error) {
    console.error("Error filtering appointments:", error);
    req.flash("error", "Something went wrong while filtering appointments.");
    res.redirect(req.get("referer") || "/patient/dashboard");
  }
};

/**
 * Render appointment booking page.
 */
module.exports.bookAppointmentPage = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId);
    let {doctorId} = req.params;
    const doctor = await Doctor.findById(doctorId);
    
    // Add date validation functions to the view context
    const { getMinBookingDate, getMaxBookingDate } = require("../utils/availabilityUtils");
    
    res.render("patient/appointments/bookappointment", { 
      doctor, 
      patient, 
      minBookingDate: getMinBookingDate(),
      maxBookingDate: getMaxBookingDate()
    });
  } catch (err) {
    console.error("Error rendering appointment booking page:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Render health records for the patient.
 */
module.exports.healthRecords = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId);
    const records = await HealthRecord.find({ patientId }).populate("doctorId");
    res.render("patient/healthrecords", { records,patient });
  } catch (err) {
    console.error("Error fetching health records:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Render prescriptions for the patient.
 */
module.exports.prescriptions = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    // Only show appointments that have been completed and have attachments (prescriptions)
    const appointments = await Appointment.find({ 
      patientId,
      status: 'completed',
      attachments: { $exists: true, $ne: [] }
    }).populate("doctorId");
     const patient = await Patient.findById(patientId);
    res.render("patient/prescriptions", { appointments,patient });
  } catch (err) {
    console.error("Error fetching prescriptions:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Remove a prescription (file) from an appointment's attachments.
 */
module.exports.deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { file } = req.query;

    if (!file) {
      req.flash("error", "Invalid file path.");
      return res.redirect("back");
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("back");
    }
    appointment.attachments = appointment.attachments.filter((attachment) => attachment !== file);
    await appointment.save();

    req.flash("success", "Prescription deleted successfully.");
    res.redirect("back");
  } catch (error) {
    console.error("Error deleting prescription:", error);
    req.flash("error", "Something went wrong.");
    res.redirect("back");
  }
};

/**
 * Render billing records for the patient.
 */
module.exports.billings = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    // Get all billing records for completed appointments
    const bills = await Billing.find({ patientId }).populate("doctorId");
    const patient = await Patient.findById(patientId);
    res.render("patient/billings", { bills,patient,razorpayKeyId: process.env.RZP_KEY_ID });
  } catch (err) {
    console.error("Error fetching billings:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Delete a billing file from the attachments.
 */
module.exports.deleteBilling = async (req, res, next) => {
  try {
    const billingId = req.params.id;
    const filePath = req.query.file;

    if (!filePath) {
      req.flash("error", "Invalid file path.");
      return res.redirect("back");
    }

    const billing = await Billing.findById(billingId);
    if (!billing) {
      req.flash("error", "Billing record not found.");
      return res.redirect("back");
    }

    billing.attachments = billing.attachments.filter(file => file !== filePath);
    await billing.save();

    req.flash("success", "Billing deleted successfully.");
    res.redirect("back");
  } catch (error) {
    console.error("Error deleting billing:", error);
    req.flash("error", "Something went wrong.");
    res.redirect("back");
  }
};

/**
 * Render the patient's list of doctors.
 */
module.exports.doctors = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId).populate("doctors");
    if (!patient) {
      req.flash("error", "Patient not found.");
      return res.redirect("/patient/dashboard");
    }
    res.render("patient/doctors", { doctors: patient.doctors,patient });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};

/**
 * Process booking of a new appointment.
 */
module.exports.bookAppointment = async (req, res, next) => {
  try {
    // User must be authenticated; otherwise, this route should not be reached.
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    const { error, value } = appointmentSchema.validate(req.body);
    if (error) {
      const messages = error.details.map(err => err.message);
      req.flash("error", messages.join(", "));
      const doctorIdFromReq = req.body?.patient?.doctorId;
      return res.redirect(doctorIdFromReq ? `/patient/bookappointment/${doctorIdFromReq}` : "/patient/dashboard");
    }

    const patientId = req.user._id;
    const { doctorId, appointmentDate, timeSlot, reason } = value.patient;

    // Get doctor details to check availability
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      req.flash("error", "Doctor not found.");
      return res.redirect(`/patient/bookappointment/${doctorId}`);
    }

    // Check if the requested time slot is available
    // Parse date string properly to avoid timezone issues
    let appointmentDateObj;
    if (typeof appointmentDate === 'string') {
        const dateParts = appointmentDate.split('-');
        if (dateParts.length === 3) {
            appointmentDateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        } else {
            appointmentDateObj = new Date(appointmentDate);
        }
    } else {
        appointmentDateObj = new Date(appointmentDate);
    }
    
    // Debug logging
    console.log('Appointment booking debug:', {
        originalDate: appointmentDate,
        parsedDate: appointmentDateObj.toDateString(),
        currentTime: new Date().toLocaleString()
    });
    
    // Validate appointment date (today to 1 week in advance)
    const { validateAppointmentDate, validateAppointmentTime } = require("../utils/availabilityUtils");
    const dateValidation = validateAppointmentDate(appointmentDateObj);
    
    if (!dateValidation.isValid) {
      req.flash("error", dateValidation.message);
      return res.redirect(`/patient/bookappointment/${doctorId}`);
    }
    
    // Validate appointment time for same-day bookings
    //const timeValidation = validateAppointmentTime(appointmentDateObj, timeSlot);
    const timeValidation = validateAppointmentTimeWithBuffer(appointmentDateObj, timeSlot);
    
    if (!timeValidation.isValid) {
      req.flash("error", timeValidation.message);
      return res.redirect(`/patient/bookappointment/${doctorId}`);
    }
    if (!isSlotAvailable(doctor, appointmentDateObj, timeSlot)) {
      req.flash("error", "The selected time slot is not available. Please choose a different time.");
      return res.redirect(`/patient/bookappointment/${doctorId}`);
    }

    // ENHANCED SLOT VALIDATION: Check slot status and prevent booking of reserved/confirmed slots
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date: appointmentDateObj,
      timeSlot
    });

    if (existingAppointment) {
      let errorMessage = "";
      switch (existingAppointment.status) {
        case 'pending':
          errorMessage = "This time slot is currently reserved by another patient and awaiting doctor confirmation. Please choose a different time.";
          break;
        case 'confirmed':
          errorMessage = "This time slot is already confirmed and booked. Please choose a different time.";
          break;
        case 'rejected':
        case 'cancelled':
        case 'completed':
          // These slots should be available, but double-check
          break;
        default:
          errorMessage = "This time slot is not available. Please choose a different time.";
      }
      
      if (errorMessage) {
        req.flash("error", errorMessage);
        return res.redirect(`/patient/bookappointment/${doctorId}`);
      }
    }

    // ENHANCED DOUBLE-BOOKING PREVENTION: Final check for concurrent bookings
    const concurrentCheck = await Appointment.findOne({
      doctorId,
      date: appointmentDateObj,
      timeSlot,
      status: { $in: ["pending", "confirmed"] }
    });

    if (concurrentCheck) {
      // Check if this is the same patient trying to book again
      if (concurrentCheck.patientId.toString() === patientId.toString()) {
        req.flash("error", "You already have a booking for this time slot. Please check your appointments.");
      } else {
        req.flash("error", "This time slot was just reserved by another patient. Please refresh and choose a different time.");
      }
      return res.redirect(`/patient/bookappointment/${doctorId}`);
    }

    const newAppointment = new Appointment({
      patientId,
      doctorId,
      date: appointmentDateObj,
      timeSlot,
      status: "pending",
      reason,
      notes: "",
      disease: "",
      summary: "",
      attachments: []
    });

    const savedAppointment = await newAppointment.save();

    // Update both doctor and patient records with the new appointment
    await Doctor.findByIdAndUpdate(doctorId, { $push: { appointments: savedAppointment._id } });
    await Patient.findByIdAndUpdate(patientId, { $push: { appointments: savedAppointment._id } });

    // Send notifications for appointment booking
    try {
        await notificationService.sendAppointmentBookingNotifications(
            savedAppointment._id,
            patientId,
            doctorId
        );
        console.log('Appointment booking notifications sent successfully');
    } catch (notificationError) {
        console.error('Error sending appointment notifications:', notificationError);
        // Don't fail the appointment booking if notifications fail
    }

    req.flash("success", "Appointment booked successfully! Your time slot is now reserved and waiting for doctor approval.");
    res.redirect("/patient/dashboard");
  } catch (error) {
    console.error("Error booking appointment:", error);
    req.flash("error", "Failed to book appointment. Please try again.");
    const fallbackDoctorId = req.body?.patient?.doctorId;
    res.redirect(fallbackDoctorId ? `/patient/bookappointment/${fallbackDoctorId}` : "/patient/dashboard");
  }
};

/**
 * Get available slots for a specific doctor and date
 */
module.exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.params;
    const patientId = req.user._id;

    // Validate that the patient is trying to book for themselves
    if (patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // ENHANCED SLOT VISIBILITY: Get ALL appointments to show slot status
    const allAppointments = await Appointment.find({
      doctorId,
      date: appointmentDate
    }).populate('patientId', 'username');

    // Generate all possible slots
    const allSlots = generateAppointmentSlots(doctor, appointmentDate);
    
    // Enhanced debug logging
    console.log('=== SLOT AVAILABILITY DEBUG ===');
    console.log('Doctor ID:', doctorId);
    console.log('Selected Date:', appointmentDate);
    console.log('All appointments found:', allAppointments.map(apt => ({
      id: apt._id,
      timeSlot: apt.timeSlot,
      status: apt.status,
      patientName: apt.patientId?.username || 'Unknown'
    })));
    console.log('Generated slots:', allSlots);
    console.log('================================');

    // Create slots with status indicators for frontend - ONLY show available and reserved slots
    const { validateAppointmentTime } = require("../utils/availabilityUtils");
    const slotsWithStatus = allSlots.map(slot => {
      const slotTime = `${slot.startTime}-${slot.endTime}`;
      
      // CRITICAL FIX: Find ALL appointments for this slot, not just the first one
      const allAppointmentsForSlot = allAppointments.filter(appointment => appointment.timeSlot === slotTime);
      
      let status = 'available';
      let disabled = false;
      let statusText = '';
      let shouldShow = true; // New flag to control visibility
      
      // Enhanced debugging for slot matching
      console.log(`Checking slot ${slotTime}:`, {
        allAppointmentsForSlot: allAppointmentsForSlot.map(apt => ({
          id: apt._id,
          timeSlot: apt.timeSlot,
          status: apt.status,
          patientName: apt.patientId?.username
        }))
      });
      
      if (allAppointmentsForSlot.length > 0) {
        // PRIORITY LOGIC: Check appointments in order of priority
        // 1. Confirmed appointments (highest priority - hide slot)
        // 2. Pending appointments (show as reserved or your_pending)
        // 3. Rejected/cancelled appointments (lowest priority - show as available)
        
        const confirmedAppointment = allAppointmentsForSlot.find(apt => apt.status === 'confirmed');
        const pendingAppointment = allAppointmentsForSlot.find(apt => apt.status === 'pending');
        
        if (confirmedAppointment) {
          // CONFIRMED appointment takes precedence - HIDE the slot
          console.log(`HIDING CONFIRMED SLOT: ${slotTime} - Patient: ${confirmedAppointment.patientId?.username}`);
          shouldShow = false;
          status = 'confirmed';
          disabled = true;
          statusText = ' ✅ Booked';
        } else if (pendingAppointment) {
          // PENDING appointment - show as reserved or your_pending
          if (pendingAppointment.patientId && pendingAppointment.patientId._id.toString() === patientId.toString()) {
            status = 'your_pending';
            disabled = false;
            statusText = ' ⏳ Your booking (Pending doctor approval)';
            shouldShow = true;
          } else {
            status = 'reserved';
            disabled = true;
            statusText = ' 🔒 Reserved by other patient (Not Confirmed)';
            shouldShow = true;
          }
        }
        // If only rejected/cancelled appointments exist, slot remains available (default values)
      }
      
      // Legacy single appointment handling (keeping for backward compatibility)
      const existingAppointment = allAppointmentsForSlot[0]; // For logging purposes
      
      
      // TIME BUFFER CHECK: Disable slots too close to current time for same-day bookings
      const timeValidation = validateAppointmentTimeWithBuffer(appointmentDate, slotTime);
      if (!timeValidation.isValid && shouldShow) {
        disabled = true;
        statusText = ' - Too soon (30 min buffer required)';
      }
      
      return {
        ...slot,
        status,
        disabled,
        statusText,
        slotTime,
        shouldShow
      };
    }).filter(slot => slot.shouldShow); // Only return slots that should be visible

    // Enhanced debugging for final results
    console.log('Final slots being returned:', slotsWithStatus.map(slot => ({
      slotTime: slot.slotTime,
      status: slot.status,
      disabled: slot.disabled,
      shouldShow: slot.shouldShow,
      statusText: slot.statusText
    })));

    // For backward compatibility, also provide availableSlots (only bookable ones)
    const availableSlots = slotsWithStatus.filter(slot => !slot.disabled);

    res.json({
      success: true,
      date: date,
      allSlotsWithStatus: slotsWithStatus,
      availableSlots: availableSlots,
      totalSlots: allSlots.length,
      bookedSlots: allAppointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed').length,
      confirmedSlots: allAppointments.filter(apt => apt.status === 'confirmed').length
    });

  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Render calendar for the patient.
 */
module.exports.calendar = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId);
    const appointments = await Appointment.find({ patientId }).populate("doctorId");
    res.render("patient/calendar", { appointments, patient });
  } catch (err) {
    console.error("Error fetching calendar:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/patient/dashboard");
  }
};
