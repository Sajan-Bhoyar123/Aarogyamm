
const express = require("express");
const router = express.Router();

const Patient = require("../models/patient");
const Doctor = require("../models/doctor");


router.get("/", async (req, res) => {
    try {
        const patientId = req.user._id;
        const patient = await Patient.findById(patientId);
        res.render("searchpages/city", { patient });
    } catch (e) {
        req.flash("error", "Error loading the page. Please try again.");
        res.redirect("/");
    }
});
router.get("/doctor", async (req, res) => {
  try {
    const { location } = req.query;
    const patientId = req.user._id;
    const patient = await Patient.findById(patientId);
    console.log("first location = ",location);
    const doctors = await Doctor.find({
      location: { $regex: new RegExp(location, 'i') } 
    });

    if (doctors.length < 1) {
      req.flash("error", `Sorry, no doctors were found in ${location}.`);
      return res.redirect("/city");
    }

    const successMsg = `Successfully found ${doctors.length} doctor(s) in ${location}.`;
    res.render("searchpages/doctorpage", {
      doctors,
      patient,
      location,
      success: successMsg,
      error: null
    });

  } catch (e) {
    console.error(e);
    req.flash("error", "An unexpected error occurred during the search.");
    res.redirect("/city");
  }
});



router.post("/:CityName/specialization", async (req, res) => {
    try {
        const patientId = req.user._id;
        const patient = await Patient.findById(patientId);
        let { CityName } = req.params;
        let { specialization: expert } = req.body;
        
        let doctors = await Doctor.find({ $and: [{ location:{$regex:new RegExp(CityName,'i')} }, { specialization: expert }] });
     
        console.log("Location = ",CityName)
        console.log("Specialization = ",expert);
        console.log(doctors);

        if (doctors.length < 1) {
             console.log("sajan");
            req.flash("error", `No doctors with specialization '${expert}' found in ${CityName}.`);
            res.redirect(`/city/doctor?location=${CityName}`);
        } else {
            let location = CityName;
            const successMsg = `Successfully found ${doctors.length} ${expert} doctor(s) in ${CityName}.`;
            res.render("searchpages/doctorpage", { doctors,location,patient, success: successMsg, error: null });
        }
    } catch (e) {
      console.log("hemant");
        req.flash("error", "An unexpected error occurred during the specialized search.");
        res.redirect("/city");
    }
});


router.get("/doctor/:doctorId", async (req, res) => {
    try {
        let { doctorId } = req.params;
        let doctor = await Doctor.findById(doctorId);
        const patientId = req.user._id;
        const patient = await Patient.findById(patientId);
        res.render("searchpages/doctordetail", { doctor, patient });
    } catch (e) {
        req.flash("error", "Could not retrieve doctor details.");
        res.redirect("/city");
    }
});

module.exports = router;