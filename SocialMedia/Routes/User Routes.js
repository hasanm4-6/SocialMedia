const express = require("express")
const { registerUser, getUsers, updateUser, deleteUser, loginUser, getLoggedInUser, sendOTP, changePassword, resetPassword, profileFetch} = require("../Controllers/User Controller")
const authenticateUser = require('../Middleware/User Auth')
const path = require("path")

const router = express.Router()

router.post("/", registerUser)      
router.get("/", getUsers)    
router.put("/:email", authenticateUser, updateUser)
router.delete("/:email", authenticateUser, deleteUser)
router.post("/login", loginUser)
router.get("/validateToken", getLoggedInUser)
router.post("/sendOtp", sendOTP)
router.post("/resetPassword", resetPassword)
router.post("/changePassword", authenticateUser, changePassword)
router.get('/profile/:email', authenticateUser, profileFetch)

module.exports = router