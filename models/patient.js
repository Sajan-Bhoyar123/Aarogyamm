const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const patientSchema = new Schema ({
    email: {
        type: String,
        required: true,
        unique: true
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },
    age: {
        type: Number
    },
    height: {
        type: Number,
    },
    weight: {
        type: Number,
    },
    bloodType: {
        type: String,
    },
    role: {
        type: String,
        enum: ['admin', 'doctor', 'patient'],
        default: 'patient'
    },
    profile:{
        filename:String,
        url:String
    },
    healthRecord: [
        {
            type: Schema.Types.ObjectId,
            ref: "HealthRecord"
        }
    ],
    appointments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Appointment"
        }
    ],
    doctors: [
        {
            type: Schema.Types.ObjectId,
            ref: "Doctor"
        }
    ],
}, {
    timestamps: true 
});

patientSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Patient", patientSchema);
