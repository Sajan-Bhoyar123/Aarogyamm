const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Doctor = require("../models/doctor");
const Patient = require("../models/patient");
const Appointment = require("../models/appointment");
const HealthRecord = require("../models/healthrecord");
const Billing = require("../models/billing");
const ExpressError = require("../utils/ExpressError");
const { canDoctorAddReports, canDoctorAcceptReject, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted } = require("../utils/availabilityUtils");
const notificationService = require("../utils/notificationService");

// Render Doctor Dashboard
module.exports.dashboard = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.user._id);
    if (!doctor) {
      req.flash("error", "Doctor not found.");
      return res.redirect("/auth/login");
    }

    // Calculate appointment counts by status for all time (week view)
    const appointmentCounts = await Appointment.aggregate([
      { $match: { doctorId: doctor._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Initialize counts for week view
    const weekCounts = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
      total: 0
    };

    // Populate week counts from aggregation result
    appointmentCounts.forEach(item => {
      if (weekCounts.hasOwnProperty(item._id)) {
        weekCounts[item._id] = item.count;
      }
      weekCounts.total += item.count;
    });

    // Calculate today's appointment counts
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayAppointmentCounts = await Appointment.aggregate([
      { 
        $match: { 
          doctorId: doctor._id,
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        } 
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Initialize counts for today view
    const todayCounts = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
      total: 0
    };

    // Populate today counts from aggregation result
    todayAppointmentCounts.forEach(item => {
      if (todayCounts.hasOwnProperty(item._id)) {
        todayCounts[item._id] = item.count;
      }
      todayCounts.total += item.count;
    });

    // Get unique patient count for today
    const todayUniquePatients = await Appointment.distinct('patientId', {
      doctorId: doctor._id,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    todayCounts.patients = todayUniquePatients.length;

    // Get unique patient count for week
    const weekUniquePatients = await Appointment.distinct('patientId', {
      doctorId: doctor._id
    });
    weekCounts.patients = weekUniquePatients.length;

    // Calculate free availability slots
    const allAppointments = await Appointment.find({ doctorId: doctor._id });
    const bookedSlotsByDay = {};
    
    allAppointments.forEach(appointment => {
      if (appointment.status === 'confirmed' || appointment.status === 'pending') {
        const dayName = appointment.date.toLocaleDateString('en-US', { weekday: 'long' });
        const timeSlot = appointment.timeSlot;
        
        if (!bookedSlotsByDay[dayName]) {
          bookedSlotsByDay[dayName] = new Set();
        }
        bookedSlotsByDay[dayName].add(timeSlot);
      }
    });

    // Calculate only truly free slots (not expired, not booked)
    let freeSlots = 0;
    
    const now = new Date();
    const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    if (doctor.availabilitySlots) {
      doctor.availabilitySlots.forEach(slot => {
        // Check if slot is expired (only for today's slots)
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        const slotEndTime = endHour * 60 + endMinute;
        const isExpired = (slot.day === todayName && currentTime > slotEndTime);
        
        // Check if slot is booked
        const dayBookedSlots = bookedSlotsByDay[slot.day] || new Set();
        const slotTime = `${slot.startTime}-${slot.endTime}`;
        const isBooked = dayBookedSlots.has(slotTime);
        
        // Only count as free if not expired and not booked
        if (!isExpired && !isBooked) {
          freeSlots++;
        }
      });
    }

    // Calculate today's free slots
    let todayFreeSlots = 0;
    
    if (doctor.availabilitySlots) {
      doctor.availabilitySlots.forEach(slot => {
        if (slot.day === todayName) {
          // Check if slot is expired
          const [endHour, endMinute] = slot.endTime.split(':').map(Number);
          const slotEndTime = endHour * 60 + endMinute;
          const isExpired = currentTime > slotEndTime;
          
          // Check if slot is booked
          const dayBookedSlots = bookedSlotsByDay[slot.day] || new Set();
          const slotTime = `${slot.startTime}-${slot.endTime}`;
          const isBooked = dayBookedSlots.has(slotTime);
          
          // Only count as free if not expired and not booked
          if (!isExpired && !isBooked) {
            todayFreeSlots++;
          }
        }
      });
    }

    res.render("doctor/dashboard", { 
      doctor, 
      weekCounts, 
      todayCounts, 
      freeSlots, 
      todayFreeSlots 
    });
  } catch (err) {
    console.error("Error fetching doctor data:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/auth/login");
  }
};

// Render Past Appointments
module.exports.pastAppointments = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      doctorId,
      date: { $lt: today }
    })
      .populate("patientId")
      .populate("doctorId");

    res.render("doctor/appointments/pastappointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
  } catch (err) {
    console.error("Error fetching past appointments:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/doctor/dashboard");
  }
};

// Render Today's Appointments
module.exports.todaysAppointments = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("patientId")
      .populate("doctorId");

    res.render("doctor/appointments/todaysappointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
  } catch (err) {
    console.error("Error fetching today's appointments:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/doctor/dashboard");
  }
};

// Render Upcoming Appointments
module.exports.upcomingAppointments = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: tomorrow }
    })
      .populate("patientId")
      .populate("doctorId");

    res.render("doctor/appointments/upcomingappointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
  } catch (err) {
    console.error("Error fetching upcoming appointments:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/doctor/dashboard");
  }
};

// Filter appointments based on query parameters and appointment type
module.exports.filterDoctorAppointments = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    const { search, date, status, timeSlot } = req.query;
    
    // Base filter with doctor ID
    let filter = { doctorId };

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
      
      appointments = await Appointment.find(filter).populate("patientId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          (appointment.patientId && appointment.patientId.username.toLowerCase().includes(search.toLowerCase())) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("doctor/appointments/pastappointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
      
    } else if (referer && referer.includes("/upcomingappointments")) {
      // Filter upcoming appointments (from tomorrow onwards)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      filter.date = { ...filter.date, $gte: tomorrow };
      
      appointments = await Appointment.find(filter).populate("patientId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          (appointment.patientId && appointment.patientId.username.toLowerCase().includes(search.toLowerCase())) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("doctor/appointments/upcomingappointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
      
    } else if (referer && referer.includes("/todaysappointments")) {
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
      
      appointments = await Appointment.find(filter).populate("patientId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          (appointment.patientId && appointment.patientId.username.toLowerCase().includes(search.toLowerCase())) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("doctor/appointments/todaysappointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
      
    } else {
      // Filter all appointments (default)
      appointments = await Appointment.find(filter).populate("patientId");
      
      // Apply search filter if provided
      if (search) {
        appointments = appointments.filter((appointment) =>
          (appointment.patientId && appointment.patientId.username.toLowerCase().includes(search.toLowerCase())) ||
          appointment.reason.toLowerCase().includes(search.toLowerCase()) ||
          appointment.disease.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return res.render("doctor/appointments", { appointments, doctor, canDoctorAcceptReject, canDoctorAddReports, canDoctorManageAppointmentDuringTime, hasAppointmentTimeStarted });
    }
  } catch (error) {
    console.error("Error filtering doctor appointments:", error);
    req.flash("error", "Something went wrong while filtering appointments.");
    res.redirect(req.get("referer") || "/doctor/dashboard");
  }
};

// Render Availability Management Page
module.exports.availability = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.user._id);
    if (!doctor) {
      req.flash("error", "Doctor not found.");
      return res.redirect("/auth/login");
    }
    
    // Get all appointments for this doctor to check slot status
    const appointments = await Appointment.find({ doctorId: doctor._id }).populate('patientId');
    
    // Create a map of booked slots by day and time
    const bookedSlots = {};
    appointments.forEach(appointment => {
      const dayName = appointment.date.toLocaleDateString('en-US', { weekday: 'long' });
      const timeSlot = appointment.timeSlot;
      const status = appointment.status;
      
      if (!bookedSlots[dayName]) {
        bookedSlots[dayName] = {};
      }
      
      if (!bookedSlots[dayName][timeSlot]) {
        bookedSlots[dayName][timeSlot] = [];
      }
      
      bookedSlots[dayName][timeSlot].push({
        status: status,
        patientName: appointment.patientId ? appointment.patientId.username : 'Unknown',
        date: appointment.date
      });
    });
    
    // Add time formatting function to the view context
    const { formatTime12Hour } = require("../utils/availabilityUtils");
    
    res.render("doctor/availability", { 
      doctor, 
      messages: req.flash(),
      formatTime12Hour,
      bookedSlots 
    });
  } catch (err) {
    console.error("Error fetching doctor data:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/doctor/dashboard");
  }
};

// Update Doctor Availability
module.exports.updateAvailability = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      req.flash("error", "Doctor not found.");
      return res.redirect("/auth/login");
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let allSlots = [];

    days.forEach(day => {
      const isAvailable = req.body[`${day}Available`] === 'on';
      if (isAvailable) {
        const daySlots = req.body[`${day}Slots`] || [];
        if (Array.isArray(daySlots)) {
          daySlots.forEach(slot => {
            if (slot.startTime && slot.endTime && slot.slotDuration) {
              allSlots.push({
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                slotDuration: parseInt(slot.slotDuration),
                isAvailable: true
              });
            }
          });
        }
      }
    });

    // Update doctor's availability slots
    doctor.availabilitySlots = allSlots;
    await doctor.save();

    req.flash("success", "Availability updated successfully!");
    res.redirect("/doctor/availability");
  } catch (err) {
    console.error("Error updating availability:", err);
    req.flash("error", "Failed to update availability. Please try again.");
    res.redirect("/doctor/availability");
  }
};

// List all Appointments
module.exports.appointments = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const appointments = await Appointment.find({ doctorId }).populate("patientId").populate("doctorId");
    const doctor = await Doctor.findById(doctorId);
    
    // Add utility functions to the view context
    const { canDoctorAddReports, canDoctorAcceptReject, autoRejectExpiredAppointments, canDoctorManageAppointmentDuringTime } = require("../utils/availabilityUtils");
    
    // Auto-reject expired appointments
    const updatedAppointments = await autoRejectExpiredAppointments(appointments);
    
    // If any appointments were auto-rejected, show a message
    if (updatedAppointments.length > 0) {
      req.flash("success", `${updatedAppointments.length} expired appointment(s) have been automatically rejected.`);
    }
    
    // Fetch updated appointments after auto-rejection
    const updatedAppointmentsList = await Appointment.find({ doctorId }).populate("patientId").populate("doctorId");
    
    res.render("doctor/appointments", { 
      appointments: updatedAppointmentsList, 
      doctor, 
      canDoctorAddReports, 
      canDoctorAcceptReject,
      canDoctorManageAppointmentDuringTime,
      hasAppointmentTimeStarted
    });
  } catch (err) {
    console.error("Error fetching doctor appointments:", err);
    req.flash("error", "Failed to load appointments. Please try again.");
    res.redirect("/doctor/dashboard");
  }
};

// Render Add Appointment Details Page
module.exports.renderAddAppointmentDetails = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    const appointment = await Appointment.findById(appointmentId).populate("patientId");
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }
    
    // Add utility functions to the view context
    const { canDoctorAddReports } = require("../utils/availabilityUtils");
    
    res.render("doctor/addAppointment", { 
      appointment, 
      doctor, 
      canDoctorAddReports 
    });
  } catch (err) {
    console.error("Error fetching appointment:", err);
    req.flash("error", "Failed to load appointment details. Please try again.");
    res.redirect("/doctor/appointments");
  }
};

// Render Edit Appointment Page
module.exports.renderEditAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId).populate("patientId");
    
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    // Fetch associated health record and billing details
    const healthRecord = await HealthRecord.findOne({ patientId: appointment.patientId });
    const billing = await Billing.findOne({ patientId: appointment.patientId });
    
    // Add utility functions to the view context
    const { canDoctorAddReports } = require("../utils/availabilityUtils");
    
    res.render("doctor/editAppointment", { 
      appointment, 
      healthRecord, 
      billing, 
      doctor, 
      canDoctorAddReports 
    });
  } catch (err) {
    console.error("Error fetching data for edit:", err);
    req.flash("error", "Failed to load appointment details. Please try again.");
    res.redirect("/doctor/appointments");
  }
};

// List Patients for the Doctor
module.exports.patients = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId).populate("patients");
    if (!doctor) {
      req.flash("error", "Doctor not found.");
      return res.redirect("/doctor/dashboard");
    }
    res.render("doctor/patients", { doctor });
  } catch (err) {
    console.error("Error fetching patients:", err);
    req.flash("error", "Failed to load patients. Please try again.");
    res.redirect("/doctor/dashboard");
  }
};

// Display Health Records for a Specific Patient
module.exports.healthRecords = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      req.flash("error", "Patient not found.");
      return res.redirect("/doctor/patients");
    }
    const healthrecords = await HealthRecord.find({ patientId });
     const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    res.render("doctor/healthrecords", { healthrecords, patient ,doctor});
  } catch (error) {
    console.error("Error fetching health records:", error);
    req.flash("error", "Failed to load health records. Please try again.");
    res.redirect("/doctor/patients");
  }
};

// Render Prescriptions between a Doctor and a Patient
module.exports.prescriptions = async (req, res, next) => {
  try {
    const { doctorId, patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      req.flash("error", "Patient not found.");
      return res.redirect("/doctor/patients");
    }
    const appointments = await Appointment.find({ doctorId, patientId });
    const doctor = await Doctor.findById(doctorId);
    res.render("doctor/prescriptions", { appointments, patient ,doctor});
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    req.flash("error", "Failed to load prescriptions. Please try again.");
    res.redirect("/doctor/patients");
  }
};

// Generate a Medical Certificate PDF for a Patient
module.exports.generateCertificate = async (req, res, next) => {
  try {
    const { admissionDate, dischargeDate } = req.body;
    const patient = await Patient.findById(req.params.patientId).populate("doctors");
    if (!patient) {
      req.flash("error", "Patient not found.");
      return res.redirect("/doctor/dashboard");
    }
    const fileName = `medical_certificate_${patient._id}.pdf`;
    const certificatesDir = path.join(__dirname, "../public/certificates");
    const filePath = path.join(certificatesDir, fileName);

    // Ensure that the certificates directory exists
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    // Create the PDF document
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add content to the certificate
    doc.fontSize(20).text("Medical Leave Certificate", { align: "center" }).moveDown();
    doc.fontSize(12).text(`Patient Name: ${patient.username}`);
    doc.text(`Email: ${patient.email}`);
    doc.text(`Gender: ${patient.gender}`);
    doc.text(`Age: ${patient.age}`);
    doc.text(`Blood Type: ${patient.bloodType}`);
    doc.text(`Doctor: ${patient.doctors[0]?.name || "N/A"}`);
    doc.text(`Admission Date: ${admissionDate}`);
    doc.text(`Discharge Date: ${dischargeDate}`);
    doc.moveDown();
    doc.text(`This is to certify that ${patient.username} was admitted from ${admissionDate} to ${dischargeDate} and requires medical leave.`);
    doc.moveDown();
    doc.text("_________________________");
    doc.text("Doctor's Signature");
    doc.end();

    stream.on("finish", () => {
      const fileUrl = `/certificates/${fileName}`;
      res.status(200).json({ fileUrl });
    });

    stream.on("error", (err) => {
      console.error("Error generating certificate:", err);
      req.flash("error", "Error generating certificate. Please try again.");
      res.redirect(`/doctor/patients/${patient._id}`);
    });
  } catch (error) {
    console.error("Server error:", error);
    req.flash("error", "Internal server error.");
    res.redirect("/doctor/patients");
  }
};

// Add Appointment Details (POST)
module.exports.addAppointmentDetails = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { username, email, gender, appointmentDate, timeSlot, symptoms, disease, billAmount } = req.body.patient;

    // Find the appointment by id
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }

    // Check if doctor can add reports (appointment must be completed)
    if (!canDoctorAddReports(appointment)) {
      req.flash("error", "Cannot add appointment details. The appointment must be completed first.");
      return res.redirect("/doctor/appointments");
    }

    // Extract the uploaded file paths
    const prescriptionUrl = req.files["patient[prescription]"]?.[0]?.path || null;
    const medicalReports = req.files["patient[medicalReports]"]?.map(file => file.path) || [];
    const billUrl = req.files["patient[bill]"]?.[0]?.path || null;

    // Update appointment details
    appointment.disease = disease;
    appointment.summary = symptoms;
    if (prescriptionUrl) {
      appointment.attachments.push(prescriptionUrl);
    }
    await appointment.save();

    // Send notification for prescription upload
    if (prescriptionUrl) {
      try {
          await notificationService.sendPrescriptionUploadNotifications(
              appointment.patientId,
              appointment.doctorId,
              'Prescription',
              prescriptionUrl
          );
          console.log('Prescription upload notification sent successfully');
      } catch (notificationError) {
          console.error('Error sending prescription notification:', notificationError);
          // Don't fail the upload if notifications fail
      }
    }

    // Create a new health record
    const healthRecord = new HealthRecord({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      disease,
      symptoms,
      attachments: medicalReports,
    });
    await healthRecord.save();

    // Create a new billing record
    const invoiceNo = `INV-${Math.floor(Math.random() * 9000) + 1000}`;
    const billing = new Billing({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment._id,
      invoiceNo,
      date: new Date(),
      appointmentDate: appointment.date,
      timeSlot: appointment.timeSlot,
      amount: billAmount, // Update this later as needed
      reason: disease,
      status: "pending",
      paymentMethod: "UPI",
      attachments: billUrl ? [billUrl] : [],
    });
    await billing.save();

    req.flash("success", "Appointment details added successfully.");
    res.redirect("/doctor/appointments");
  } catch (err) {
    console.error("Error updating records:", err);
    req.flash("error", "An error occurred while updating appointment details.");
    res.redirect("/doctor/appointments");
  }
};

// Edit Appointment Details (POST)
module.exports.editAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { symptoms, disease, amount } = req.body.patient;

    // Validate mandatory fields
    if (!disease || !symptoms) {
      req.flash("error", "Disease and symptoms are required.");
      return res.redirect("back");
    }

    // Extract uploaded files paths
    const prescriptionUrl = req.files?.["patient[prescription]"]?.[0]?.path || null;
    const medicalReports = req.files?.["patient[medicalReports]"]?.map(file => file.path) || [];
    const billUrl = req.files?.["patient[bill]"]?.[0]?.path || null;

    // Find and update appointment details
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }

    // Check if doctor can add reports (appointment must be completed)
    if (!canDoctorAddReports(appointment)) {
      req.flash("error", "Cannot edit appointment details. The appointment must be completed first.");
      return res.redirect("/doctor/appointments");
    }

    appointment.disease = disease;
    appointment.summary = symptoms;
    if (prescriptionUrl) {
      appointment.attachments = [prescriptionUrl]; // Replace previous prescription if any
    }
    await appointment.save();

    // Send notification for prescription upload
    if (prescriptionUrl) {
      try {
          await notificationService.sendPrescriptionUploadNotifications(
              appointment.patientId,
              appointment.doctorId,
              'Prescription',
              prescriptionUrl
          );
          console.log('Prescription upload notification sent successfully');
      } catch (notificationError) {
          console.error('Error sending prescription notification:', notificationError);
          // Don't fail the upload if notifications fail
      }
    }

    // Update the associated health record
    const healthRecord = await HealthRecord.findOne({ patientId: appointment.patientId });
    if (healthRecord) {
      healthRecord.disease = disease;
      healthRecord.symptoms = symptoms;
      if (medicalReports.length > 0) {
        healthRecord.attachments = medicalReports;
      }
      await healthRecord.save();
    }

    // Update the billing record
    const billing = await Billing.findOne({ patientId: appointment.patientId });
    if (billing) {
      billing.reason = disease;
      billing.amount = amount;
      if (billUrl) {
        billing.attachments = [billUrl];
      }
      await billing.save();
    }

    req.flash("success", "Appointment details updated successfully.");
    res.redirect("/doctor/appointments");
  } catch (err) {
    console.error("Error updating records:", err);
    req.flash("error", "Internal Server Error while updating appointment.");
    res.redirect("/doctor/appointments");
  }
};

// Confirm an Appointment (POST)
module.exports.confirmAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }

    // Check if doctor can accept/reject this appointment
    if (!canDoctorAcceptReject(appointment)) {
      req.flash("error", "Cannot accept appointment. Either the appointment time has passed or it's not in pending status.");
      return res.redirect("/doctor/appointments");
    }

    // SLOT CONFIRMATION LOGIC: Update appointment status to "confirmed"
    // This permanently reserves the slot and removes it from patient view
    appointment.status = "confirmed";
    appointment.statusUpdatedAt = new Date();
    appointment.confirmedAt = new Date();
    await appointment.save();
    
    console.log(`Slot confirmed: ${appointment.timeSlot} on ${appointment.date} is now permanently booked`);

    // Add the patient to the doctor's list (avoiding duplicates)
    await Doctor.findByIdAndUpdate(appointment.doctorId, {
      $addToSet: { patients: appointment.patientId }
    });

    // Add the doctor to the patient's list (avoiding duplicates)
    await Patient.findByIdAndUpdate(appointment.patientId, {
      $addToSet: { doctors: appointment.doctorId }
    });

            // Send notification for appointment confirmation
        try {
            await notificationService.sendAppointmentStatusNotifications(
                appointment._id,
                appointment.patientId,
                appointment.doctorId,
                'confirmed'
            );
            console.log('Appointment confirmation notification sent successfully');
        } catch (notificationError) {
            console.error('Error sending confirmation notification:', notificationError);
            // Don't fail the appointment confirmation if notifications fail
        }

    req.flash("success", "Appointment confirmed successfully.");
    res.redirect("/doctor/appointments");
  } catch (err) {
    console.error("Error confirming appointment:", err);
    req.flash("error", "Internal Server Error while confirming appointment.");
    res.redirect("/doctor/appointments");
  }
};

// Reject an Appointment (POST)
module.exports.rejectAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }

    // Check if doctor can accept/reject this appointment
    if (!canDoctorAcceptReject(appointment)) {
      req.flash("error", "Cannot reject appointment. Either the appointment time has passed or it's not in pending status.");
      return res.redirect("/doctor/appointments");
    }

    // ENHANCED SLOT RELEASE LOGIC: Update appointment status to "rejected"
    // This automatically frees up the time slot for other patients to book
    // The slot will become available again since rejected appointments are treated as available
    appointment.status = "rejected";
    appointment.statusUpdatedAt = new Date();
    appointment.rejectedAt = new Date();
    await appointment.save();
    
    console.log(`Slot released: ${appointment.timeSlot} on ${appointment.date} is now available for booking again`);

            // Send notification for appointment rejection
        try {
            await notificationService.sendAppointmentStatusNotifications(
                appointment._id,
                appointment.patientId,
                appointment.doctorId,
                'rejected'
            );
            console.log('Appointment rejection notification sent successfully');
        } catch (notificationError) {
            console.error('Error sending rejection notification:', notificationError);
            // Don't fail the appointment rejection if notifications fail
        }

    req.flash("success", "Appointment rejected successfully.");
    res.redirect("/doctor/appointments");
  } catch (err) {
    console.error("Error rejecting appointment:", err);
    req.flash("error", "Internal Server Error while rejecting appointment.");
    res.redirect("/doctor/appointments");
  }
};

// Mark appointment as "Patient Not Come"
module.exports.markPatientNotCome = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }

    // Check if doctor can manage appointment during its time
    const { canDoctorManageAppointmentDuringTime } = require("../utils/availabilityUtils");
    if (!canDoctorManageAppointmentDuringTime(appointment)) {
      req.flash("error", "Cannot mark patient as not come. Appointment time hasn't started or has already passed.");
      return res.redirect("/doctor/appointments");
    }

    // Update appointment status
    appointment.status = "patient_not_come";
    appointment.statusUpdatedAt = new Date();
    appointment.notes = (appointment.notes || '') + ' [Patient did not show up for the appointment]';
    await appointment.save();

    // Send notification for patient not come
    try {
      const notificationService = require("../utils/notificationService");
      await notificationService.sendAppointmentStatusNotifications(
        appointment._id,
        appointment.patientId,
        appointment.doctorId,
        'patient_not_come'
      );
      console.log('Patient not come notification sent successfully');
    } catch (notificationError) {
      console.error('Error sending patient not come notification:', notificationError);
    }

    req.flash("success", "Appointment marked as 'Patient Not Come' successfully.");
    res.redirect("/doctor/appointments");
  } catch (err) {
    console.error("Error marking patient not come:", err);
    req.flash("error", "Internal Server Error while updating appointment.");
    res.redirect("/doctor/appointments");
  }
};

// Complete appointment and redirect to add details
module.exports.completeAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/doctor/appointments");
    }

    // Check if doctor can manage appointment during its time
    const { canDoctorManageAppointmentDuringTime } = require("../utils/availabilityUtils");
    if (!canDoctorManageAppointmentDuringTime(appointment)) {
      req.flash("error", "Cannot complete appointment. Appointment time hasn't started or has already passed.");
      return res.redirect("/doctor/appointments");
    }

    // Update appointment status to completed
    appointment.status = "completed";
    appointment.statusUpdatedAt = new Date();
    await appointment.save();

    req.flash("success", "Appointment marked as completed. Please add prescription and medical details.");
    // Redirect to add appointment details page
    res.redirect(`/doctor/appointments/addAppointmentDetails/${appointmentId}`);
  } catch (err) {
    console.error("Error completing appointment:", err);
    req.flash("error", "Internal Server Error while completing appointment.");
    res.redirect("/doctor/appointments");
  }
};

// Get filtered appointment counts (API endpoint)
module.exports.getFilteredAppointmentCounts = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const { filter, startDate, endDate } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (filter) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateFilter = {
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };
        break;
        
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        dateFilter = {
          date: {
            $gte: startOfWeek,
            $lt: endOfWeek
          }
        };
        break;
        
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        dateFilter = {
          date: {
            $gte: startOfMonth,
            $lt: endOfMonth
          }
        };
        break;
        
      case 'custom':
        if (startDate && endDate) {
          const customStart = new Date(startDate);
          customStart.setHours(0, 0, 0, 0);
          const customEnd = new Date(endDate);
          customEnd.setHours(23, 59, 59, 999);
          dateFilter = {
            date: {
              $gte: customStart,
              $lte: customEnd
            }
          };
        }
        break;
        
      default:
        // All time - no date filter
        break;
    }
    
    // Build the match criteria
    const matchCriteria = { doctorId: doctorId, ...dateFilter };
    
    // Get appointment counts by status
    const appointmentCounts = await Appointment.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Initialize counts
    const counts = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
      total: 0
    };
    
    // Populate counts from aggregation result
    appointmentCounts.forEach(item => {
      if (counts.hasOwnProperty(item._id)) {
        counts[item._id] = item.count;
      }
      counts.total += item.count;
    });
    
    // Get unique patient count for the filtered period
    const uniquePatients = await Appointment.distinct('patientId', matchCriteria);
    counts.patients = uniquePatients.length;
    
    // Calculate free slots for the filtered period (simplified for now)
    counts.freeSlots = 0; // You can implement this based on your availability logic
    
    res.json({
      success: true,
      data: counts,
      filter: filter,
      dateRange: dateFilter.date ? {
        start: dateFilter.date.$gte,
        end: dateFilter.date.$lt || dateFilter.date.$lte
      } : null
    });
    
  } catch (err) {
    console.error('Error fetching filtered appointment counts:', err);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Calendar for Doctor
module.exports.calendar = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const doctor = await Doctor.findById(doctorId);
    const appointments = await Appointment.find({ doctorId }).populate("patientId");
    res.render("doctor/calendar", { appointments, doctor });
  } catch (err) {
    console.error("Error fetching calendar:", err);
    req.flash("error", "Internal Server Error.");
    res.redirect("/doctor/dashboard");
  }
};
