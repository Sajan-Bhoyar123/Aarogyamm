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
    let filter = {};

    if (date) filter.date = date;
    if (status) filter.status = status;
    if (timeSlot) filter.timeSlot = timeSlot;

    let appointments = await Appointment.find(filter).populate("doctorId");

    if (search) {
      appointments = appointments.filter((appointment) =>
        appointment.doctorId.username.toLowerCase().includes(search.toLowerCase()) ||
        appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
        appointment.disease.toLowerCase().includes(search.toLowerCase())
      );
    }

    const referer = req.get("referer");
    if (referer && referer.includes("/pastappointments")) {
      return res.render("patient/appointments/pastappointments", { appointment,patient });
    } else if (referer && referer.includes("/upcomingappointments")) {
      return res.render("patient/appointments/upcomingappointments", { appointments,patient });
    } else {
      return res.render("patient/appointments/todaysappointments", { appointments,patient });
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
    const appointments = await Appointment.find({ patientId }).populate("doctorId");
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
    const appointmentDateObj = new Date(appointmentDate);
    
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

    // Check if there are any existing appointments at the same time
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date: appointmentDateObj,
      timeSlot,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existingAppointment) {
      req.flash("error", "This time slot is already booked. Please choose a different time.");
      return res.redirect(`/patient/bookappointment/${doctorId}`);
       //return res.redirect(`/city/doctor/${doctorId}`);
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

    req.flash("success", "Appointment booked successfully!");
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

    // Get existing appointments for the date to filter out booked slots
    const existingAppointments = await Appointment.find({
      doctorId,
      date: appointmentDate,
      status: { $in: ["pending", "confirmed"] }
    });

    // Generate all available slots
    const allSlots = generateAppointmentSlots(doctor, appointmentDate);

    // Filter out already booked slots and time slots that are too close for same-day bookings
    const { validateAppointmentTime } = require("../utils/availabilityUtils");
    const availableSlots = allSlots.filter(slot => {
      const slotTime = `${slot.startTime}-${slot.endTime}`;
      
      // Check if slot is already booked
      const isBooked = existingAppointments.some(appointment => appointment.timeSlot === slotTime);
      if (isBooked) return false;
      
      // Check if slot is too close to current time for same-day bookings
      //const timeValidation = validateAppointmentTime(appointmentDate, slotTime);
      const timeValidation = validateAppointmentTimeWithBuffer(appointmentDate, slotTime);
      if (!timeValidation.isValid) return false;
      
      return true;
    });

    res.json({
      success: true,
      date: date,
      availableSlots: availableSlots,
      totalSlots: allSlots.length,
      bookedSlots: existingAppointments.length
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
