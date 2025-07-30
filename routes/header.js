
const express = require("express");
const router = express.Router();
router.get("/features",(req,res,next)=>{
      res.render("headerpages/features")
})
router.get("/home",(req,res,next)=>{
      res.redirect("/home")
})
router.get("/about",(req,res,next)=>{
      res.render("headerpages/about")
})
router.get("/contact",(req,res,next)=>{
      res.render("headerpages/contact")
})
router.post("/contact",(req,res,next)=>{
      req.flash("success","Successfully Submitted Your Form");
      res.redirect("/header/home");
})

module.exports = router;

