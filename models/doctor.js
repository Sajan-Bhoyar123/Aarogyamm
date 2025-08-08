const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const doctorSchema = new Schema ({
    email: {
        type: String,
        required: true,
        unique: true
    },
    specialization: {
        type: String,
        required:true

    },

    experience: {
        type: Number,
        required:true
    },
    Degree:{
        type:String,
        require:true
    },
    availabilitySlots: [
        {
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                required: true
            },
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            },
            isAvailable: {
                type: Boolean,
                default: true
            },
            slotDuration: {
                type: Number,
                default: 30 // in minutes
            }
        }
    ],
    hospital: {
        type: String,
         required:true
    },
    
    location:{
        type:String,
        required:true
    },
    country:{
        type:String,
    },
    consultantFees: {
        type: Number,
          required:true
    },
    phone: {
        type: String,
        required:true
    },
    profile: {
        filename: String,
        url:String,
    },
     geometry: {
         type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            
        },
        coordinates: {
            type: [Number],
            required: true
          }
    },
    role: {
        type: String,
        enum: ['admin', 'doctor', 'patient'],
        default: 'doctor'
    },
    appointments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Appointment"
        }
    ],
    patients: [
        {
            type: Schema.Types.ObjectId,
            ref: "Patient"
        }
    ],
}, {
    timestamps: true 
});

doctorSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Doctor", doctorSchema);
