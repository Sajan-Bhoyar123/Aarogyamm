const Joi = require('joi');

module.exports.appointmentSchema = Joi.object({
    patient: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      lastName: Joi.string().trim().min(2).max(50).required(),
      gender: Joi.string().valid('male', 'female', 'other').required(),
      mobile: Joi.string().pattern(/^\d{10}$/).required().messages({
        'string.pattern.base': 'Mobile number must be a valid 10-digit number.'
      }),
      email: Joi.string().email().required(),
      doctorId: Joi.string().required(), // could validate as an ObjectId if needed
      // Allow booking for today or future dates - use start of today instead of 'now'
      appointmentDate: Joi.date().min(new Date().setHours(0,0,0,0)).required().messages({
        'date.min': 'Appointment date must be today or in the future.'
      }),
      // Accept any HH:MM-HH:MM format to support dynamic slots from doctor's availability
      timeSlot: Joi.string()
        .pattern(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
        .required()
        .messages({ 'string.pattern.base': 'Time slot must be in HH:MM-HH:MM format.' }),
      reason: Joi.string().allow('').max(500) // optional
    }).required()
  });

  module.exports.patientSchema = Joi.object({
    patient: Joi.object({
      email: Joi.string().email().required().messages({
        'any.required': 'Email is required.'
      }),
      username: Joi.string().min(3).max(30).required().messages({
        'any.required': 'Username is required.'
      }),
      password: Joi.string().min(6).required().messages({
        'any.required': 'Password is required.'
      }),
      gender: Joi.string().valid('male', 'female', 'other').required().messages({
        'any.required': 'Gender is required.'
      }),
      age: Joi.number().integer().min(1).max(120).required().messages({
        'any.required': 'Age is required.'
      }),
      height: Joi.number().integer().min(50).max(300).optional().messages({}),
      weight: Joi.number().integer().min(1).max(500).optional().messages({}),
      bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-').optional().messages({})
    })
  });  
  
  module.exports.doctorSchema = Joi.object({
    doctor: Joi.object({
      email: Joi.string().email().required().messages({
        'any.required': 'Email is required.'
      }),
      username: Joi.string().min(3).max(30).required().messages({
        'any.required': 'Username is required.'
      }),
      password: Joi.string().min(6).required().messages({
        'any.required': 'Password is required.'
      }),
      specialization: Joi.string().min(3).required().messages({
        'any.required': 'Specialization is required.'
      }),
      experience: Joi.number().integer().min(0).required().messages({
        'any.required': 'Experience is required.'
      }),
      hospital: Joi.string().min(3).required().messages({
        'any.required': 'Hospital name is required.'
      }),
      consultantFees: Joi.number().positive().required().messages({
        'any.required': 'Consultant fees are required.'
      }),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'any.required': 'Phone number is required.'
      })
    }),
    profile: Joi.any().allow(null, '').messages({
      'any.allow': 'Profile image cannot be empty.'
    })
  });
  