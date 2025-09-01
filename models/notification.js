const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientModel'
    },
    recipientModel: {
        type: String,
        required: true,
        enum: ['Patient', 'Doctor']
    },
    type: {
        type: String,
        required: true,
        enum: [
            'welcome',
            'appointment_booked',
            'appointment_confirmed',
            'appointment_rejected',
            'appointment_cancelled',
            'appointment_reminder',
            'payment_confirmation',
            'prescription_uploaded',
            'report_uploaded',
            'daily_reminder'
        ]
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: Schema.Types.Mixed,
        default: {}
    },
    emailSent: {
        type: Boolean,
        default: false
    },
    smsSent: {
        type: Boolean,
        default: false
    },
    emailSentAt: {
        type: Date
    },
    smsSentAt: {
        type: Date
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, { 
    timestamps: true 
});

// Index for efficient querying
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: 1 });
notificationSchema.index({ emailSent: 1, smsSent: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
