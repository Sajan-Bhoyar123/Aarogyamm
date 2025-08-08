const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patient");
const { isAuthenticated, isAuthorized } = require("../middleware");
const { appointmentSchema } = require('../schema');
const Appointment = require("../models/appointment");
const Billing = require("../models/billing");
const Patient = require("../models/patient")
const AIService = require('../utils/aiService');

// GET routes
router.get("/dashboard", isAuthenticated, patientController.dashboard);
router.get("/upcomingappointments", isAuthenticated, patientController.upcomingAppointments);
router.get("/todaysappointments", isAuthenticated, patientController.todaysAppointments);
router.get("/pastappointments", isAuthenticated, patientController.pastAppointments);
router.get("/filterappointments", isAuthenticated, patientController.filterAppointments);
router.get("/bookappointment/:doctorId", isAuthenticated, patientController.bookAppointmentPage);
router.get("/healthrecords", isAuthenticated, patientController.healthRecords);
router.get("/prescriptions", isAuthenticated, patientController.prescriptions);
router.get("/doctors", isAuthenticated, patientController.doctors);
router.get("/billings", isAuthenticated, patientController.billings);

// Calendar route
router.get("/calendar", patientController.calendar);

// Grouped DELETE routes for canceling appointments
["upcomingappointments", "todaysappointments", "pastappointments"].forEach(type => {
  router
    .route(`/${type}/cancel/:id`)
    .delete(
      isAuthenticated,
      isAuthorized(Appointment, "id", "patientId"),
      patientController.cancelAppointment
    );
});

// POST routes for deleting files
router
  .route("/prescriptions/delete/:id")
  .post(
    isAuthenticated,
    isAuthorized(Appointment, "id", "patientId"),
    patientController.deletePrescription
  );

router
  .route("/billings/delete/:id")
  .post(
    isAuthenticated,
    isAuthorized(Billing, "id", "patientId"),
    patientController.deleteBilling
  );

// POST route for booking appointment
router
  .route("/bookappointment")
  .post(isAuthenticated, patientController.bookAppointment);

// GET route for available slots
router.get("/available-slots/:doctorId/:date", isAuthenticated, patientController.getAvailableSlots);

router.get("/chat",async (req, res) => {
   const patientId = req.user._id;
  const patient = await Patient.findById(patientId);
  res.render("patient/chat",{patient});
});  

// POST route for chat messages
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId);

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate AI response using the new AI service
    const aiResponse = await AIService.generateResponse(message, 'patient', patient.username);

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
