const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
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
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
        default: "pending"
    },
    reason: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    disease: {
        type: String
    },
    summary: {
        type: String
    },
    attachments: {
        type: [String],
        default: []
    },
    statusUpdatedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true }); 

module.exports = mongoose.model("Appointment", appointmentSchema);
