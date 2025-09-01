const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const doctorController = require("../controllers/doctor");
const AIService = require('../utils/aiService');

// Configure multer for uploads
const storage = require("../cloudConfig.js").storage;
const upload = multer({ storage });

// GET routes
router.get("/dashboard", doctorController.dashboard);
router.get("/availability", doctorController.availability);
router.get("/appointments", doctorController.appointments);
router.get("/pastappointments", doctorController.pastAppointments);
router.get("/todaysappointments", doctorController.todaysAppointments);
router.get("/upcomingappointments", doctorController.upcomingAppointments);
router.get("/filterdoctorappointments", doctorController.filterDoctorAppointments);
router.get("/api/appointment-counts", doctorController.getFilteredAppointmentCounts);
router.get("/patients", doctorController.patients);
router.get("/patient/:id/healthrecords", doctorController.healthRecords);
router.get("/:doctorId/patient/:patientId/prescriptions", doctorController.prescriptions);
router.get("/calendar", doctorController.calendar);

// POST routes for availability management
router.post("/availability", doctorController.updateAvailability);

// Combined routes using `router.route()`
router
  .route("/appointments/addAppointmentDetails/:id")
  .get(doctorController.renderAddAppointmentDetails)
  .post(
    upload.fields([
      { name: "patient[prescription]", maxCount: 1 },
      { name: "patient[medicalReports]", maxCount: 5 },
      { name: "patient[bill]", maxCount: 1 },
    ]),
    doctorController.addAppointmentDetails
  );

router
  .route("/appointments/edit/:id")
  .get(doctorController.renderEditAppointment)
  .post(
    upload.fields([
      { name: "patient[prescription]", maxCount: 1 },
      { name: "patient[medicalReports]", maxCount: 5 },
      { name: "patient[bill]", maxCount: 1 },
    ]),
    doctorController.editAppointment
  );

// POST-only routes
router.post("/generate-certificate/:patientId", doctorController.generateCertificate);
router.post("/appointments/confirm/:id", doctorController.confirmAppointment);
router.post("/appointments/reject/:id", doctorController.rejectAppointment);
router.post("/appointments/patient-not-come/:id", doctorController.markPatientNotCome);
router.post("/appointments/complete/:id", doctorController.completeAppointment);

// Chat routes
router.get("/chat", async (req, res) => {
  try {
    const doctorId = req.user._id;
    const doctor = await require("../models/doctor").findById(doctorId);
    res.render("doctor/chat", { doctor });
  } catch (error) {
    console.error('Chat page error:', error);
    res.redirect("/doctor/dashboard");
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const doctorId = req.user._id;
    const doctor = await require("../models/doctor").findById(doctorId);

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate AI response using the new AI service
    const aiResponse = await AIService.generateResponse(message, 'doctor', doctor.username);

    res.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      response: "I'm having trouble processing your message right now. Please try again in a moment.",
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
