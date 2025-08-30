const mongoose = require("mongoose");
const ExpressError = require("./utils/ExpressError"); 
const Doctor = require("./models/doctor");

module.exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log("Authentication done!");
    return next(); 
  }

  req.flash("danger", "Please log in to access this page.");
  res.redirect("/auth/login"); 
}


module.exports.isAuthorized = (Model, paramIdField = 'id', resourceOwnerField = '_id') => {
  return async (req, res, next) => {
    const resourceId = req.params[paramIdField];

    
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return next(new ExpressError(400, "Invalid resource ID."));
    }

    try {
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return next(new ExpressError(404, "Resource not found."));
      }

      if (!resource[resourceOwnerField].equals(req.user._id)) {
        return next(new ExpressError(403, "You are not authorized to perform this action."));
      }
      
      console.log("Authorization done!");
      next();
    } catch (err) {
      console.error(err);
      return next(new ExpressError(500, "An error occurred while checking ownership."));
    }
  };
};

module.exports.isPatientOfDoctor = async (req, res, next) => {
  const patientId = req.params.id;


  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return next(new ExpressError(400, "Invalid patient ID."));
  }
  
  try {
    
    const doctor = await Doctor.findById(req.user._id).populate("patients");

    if (!doctor) {
      return next(new ExpressError(404, "Doctor not found."));
    }

   
    const isAssociated = doctor.patients.some(patient =>
      patient._id.toString() === patientId.toString()
    );

    if (!isAssociated) {
      return next(new ExpressError(403, "You are not authorized to access this patient."));
    }

   
    next();
  } catch (err) {
    console.error(err);
    return next(new ExpressError(500, "Server error while verifying patient association."));
  }
};

module.exports.isDoctorOfPatient = (Appointment) => async (req, res, next) => {
  const { doctorId, patientId } = req.params;

 
  if (!req.user._id.equals(doctorId)) {
    return next(new ExpressError("Unauthorized access.", 403));
  }

  const appointment = await Appointment.findOne({ doctorId, patientId });
  if (!appointment) {
    return next(new ExpressError("You are not authorized to view this patient's prescriptions.", 403));
  }

  next();
};

module.exports.isDoctorOfPatientBySession = (AppointmentModel) => {
  return async (req, res, next) => {
    const doctorId = req.user._id.toString();
    const patientId = req.params.patientId;

    try {
      const appointment = await AppointmentModel.findOne({ doctorId, patientId });

      if (!appointment) {
        throw new ExpressError(403, "You are not authorized to access this patient's records.");
      }

      next();
    } catch (err) {
      next(err); 
    }
  };
};
