const express = require("express");
const router = express.Router();
const path = require("path");
const authController = require("../controllers/auth");
const multer  = require('multer')
const {storage} = require("../cloudConfig.js")
const upload = multer({ storage })
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken= process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
// Auth routes
router
  .route("/login")
  .get(authController.logInFormRender)
  .post(authController.loggedIn);

router
  .route("/signup")
  .get(authController.signUpPageRender);

router
  .route("/signup/doctor")
  .get(authController.doctorSignUpPageRender)
  .post(upload.single("profile"), authController.doctorSignedUp);

router
  .route("/signup/patient")
  .get(authController.patientSignUpPageRender)
  .post(upload.single("profile"),authController.patientSignedUp);

router.get("/logout", authController.loggedOut);

module.exports = router;
