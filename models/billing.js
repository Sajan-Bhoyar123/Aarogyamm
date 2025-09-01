const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const billingSchema = new Schema({
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
        required: true
    },
    appointmentId: {
        type: Schema.Types.ObjectId,
        ref: "Appointment",
        required: false // Optional for backward compatibility
    },
    invoiceNo: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    appointmentDate: {
        type: Date,
        required: false // Store the actual appointment date
    },
    timeSlot: {
        type: String,
        required: false // Store the appointment time slot
    },
    amount: {
        type: Number,
        required: true
    },
    reason: {
        type: String, // e.g., "Consultation", "Surgery", "Lab Test"
        required: true
    },
    attachments: {
        type: [String], // Array of file paths for uploaded bills (PDFs, images)
        default: []
    },
    status: {
        type: String,
        enum: ["pending", "paid", "due"], // Billing status
        default: "pending"
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "card", "UPI", "insurance"], // Payment method options
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Billing", billingSchema);
