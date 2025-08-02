const passport = require("passport");
const path = require("path");

const Doctor = require("../models/doctor");
const Patient = require("../models/patient");
const ExpressError = require("../utils/ExpressError");
const { patientSchema, doctorSchema } = require("../schema");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken= process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
/**
 * Render the login form.
 */
module.exports.logInFormRender = (req, res) => {
  res.render("auth/login/login");
};

/**
 * Render the main signup page.
 */
module.exports.signUpPageRender = (req, res) => {
  res.render("auth/signup/signup");
};

/**
 * Render the doctor signup page.
 */
module.exports.doctorSignUpPageRender = (req, res) => {
  res.render("auth/signup/doctor");
};

/**
 * Render the patient signup page.
 */
module.exports.patientSignUpPageRender = (req, res) => {
  res.render("auth/signup/patient");
};

/**
 * Handle login for both doctors and patients.
 */
module.exports.loggedIn = async (req, res, next) => {
  try {
    const { username } = req.body;
    // Check if the user exists as a Doctor
    const doctor = await Doctor.findOne({ username });
    if (doctor) {
      passport.authenticate("doctor-local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
          req.flash("danger", "Invalid username or password.");
          return res.redirect("/auth/login");
        }
        req.login(user, (err) => {
          if (err) return next(err);
          req.flash("success", "Welcome back to Aarogyam!");
          return res.redirect("/doctor/dashboard");
        });
      })(req, res, next);
      return;
    }

    // Check if the user exists as a Patient
    const patient = await Patient.findOne({ username });
    if (patient) {
      passport.authenticate("patient-local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
          req.flash("danger", "Invalid username or password.");
          return res.redirect("/auth/login");
        }
        req.login(user, (err) => {
          if (err) return next(err);
          req.flash("success", "Welcome back to Aarogyam!");
          return res.redirect("/patient/dashboard");
        });
      })(req, res, next);
      return;
    }

    // If neither doctor nor patient found
    req.flash("danger", "Invalid username or password.");
    return res.redirect("/auth/login");
  } catch (error) {
    console.error("Error during login:", error);
    req.flash("danger", "Something went wrong. Please try again.");
    return res.redirect("/auth/login");
  }
};

/**
 * Handle doctor signup.
 */
module.exports.doctorSignedUp = async (req, res, next) => {
 try{
    const {email, username, password, specialization,Degree, experience, hospital,location,country, consultantFees, phone } = req.body;
      let response =   await geocodingClient.forwardGeocode({
               query: location ,
               limit: 1,
            })
            .send()
           ;
    let url= req.file.path;
    let filename = req.file.filename;
    console.log("filename = ",filename);
    console.log("url = ",url);
    const newDoctor = new Doctor({
      email,
      username,
      specialization,
      Degree,
      experience,
      hospital,
      location,
      country,
      consultantFees,
      phone,
    });
    newDoctor.profile = {url,filename};
    console.log(newDoctor);
    newDoctor.geometry = response.body.features[0].geometry;

    await Doctor.register(newDoctor, password);

    // Auto-login after signup
    req.login(newDoctor, async (err) => {
      if (err) {
        req.flash("error", "Something went wrong during login. Please try again.");
        return next(err);
      }
      // Verify doctor is in DB after login
      const doctor = await Doctor.findById(req.user._id);
      if (!doctor) {
        req.flash("error", "Doctor not found. Please sign up again.");
        return res.redirect("/auth/signup/doctor");
      }
      req.flash("success", "Welcome to Aarogyam, Doctor!");
      return res.redirect("/doctor/dashboard")
    });
  }catch(err){
     console.log(err);
  }


};

/**
 * Handle patient signup.
 */
module.exports.patientSignedUp = async (req, res, next) => {
  try {

    const { username, email, password, gender, age, height, weight, bloodType } = req.body;
    // Create new Patient instance
    const newPatient = new Patient({ username, email, gender, age, height, weight, bloodType });
    let filename = req.file.filename;
    let url = req.file.path;
    newPatient.profile = {filename,url};
    // Register patient with hashed password
    const registeredPatient = await Patient.register(newPatient, password);

    // Auto-login after signup
    req.login(registeredPatient, (err) => {
      if (err) {
        req.flash("error", "Something went wrong during login. Please try again.");
        return next(err);
      }
      req.flash("success", "Welcome to Aarogyam!");
      return res.redirect("/patient/dashboard");
    });
  } catch (error) {
    console.error("Error registering patient:", error);
    req.flash("error", "Signup failed. Please check your details and try again.");
    return res.redirect("/auth/signup/patient");
  }
};

/**
 * Handle logout.
 */
module.exports.loggedOut = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      req.flash("error", "Logout failed. Please try again.");
      return res.redirect("back");
    }else{
      res.redirect("/home");
    }
   
  });
};
