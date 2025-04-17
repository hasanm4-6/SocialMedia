const bcrypt = require("bcrypt")
const UserModel = require("../Models/User Model")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")

const userSecretKEY = "SeCrEtKeY"

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { 
        user: "hasanmunir406@gmail.com", 
        pass: "vnfp nhao lrqr zmma"    
    },
    logger: true,
    debug: true
})

exports.registerUser = async (req, res) => {
    const { email, name, password } = req.body

    try {
        const existingUser = await UserModel.findOne({ email })
        if (existingUser) return res.status(400).json({ message: "User already exists." })

        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const newUser = new UserModel({ email, name, password: hashedPassword })
        await newUser.save()

        res.status(201).json({ message: "User added successfully.", user: newUser })
    } 
    catch (error) {
        console.error("Register User Error:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

exports.getUsers = async (req, res) => {
    try {
        const users = await UserModel.find()
        res.json(users)
    } 
    catch (error) {
        console.error("Geting User Error:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

exports.loginUser = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required in the ServerSide' })
    }
    
    try {
        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: 'Invalid Email' })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: 'Password not matched' })
        }

        let token = jwt.sign(
            { 
                id: user._id, 
                name: user.name,
                email: user.email
            },
            userSecretKEY
        )

        res.status(200).json({ 
            message: 'Login successful', 
            token, 
            user 
        })
    } 
    catch (error) {
        console.error("Login User Error:", error)
        res.status(500).json({ message: 'Error logging in', error: error.message })
    }
}



exports.updateUser = async (req, res) => {
    const { email } = req.params
    const { name, password } = req.body

    try {
        let updateData = { name }

        if (password) {
            const saltRounds = 10
            updateData.password = await bcrypt.hash(password, saltRounds)
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            { email },
            updateData,
            { new: true }
        )

        if (!updatedUser) return res.status(404).json({ message: "User not found." })

        res.status(200).json({ message: "User updated successfully.", user: updatedUser })
    } 
    catch (error) {
        console.error("Updating User Error:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

exports.deleteUser = async (req, res) => {
    const { email } = req.params
    try {
        const deletedUser = await UserModel.findOneAndDelete({ email })
        if (!deletedUser) return res.status(404).json({ message: "User not found." })

        res.status(200).json({ message: "User deleted successfully." })
    } 
    catch (error) {
        console.error("Deleting User Error:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

exports.getLoggedInUser = (req, res) => {
    const authHeader = req.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token is missing or invalid' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, userSecretKEY)
        res.json({ 
            id: decoded.id, 
            name: decoded.name,
            email: decoded.email
        })
    } 
    catch (error) {
        console.error("Validation User Error:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

exports.sendOTP = async (req, res) => {
    const { email } = req.body

    try {
        const otp = Math.floor(100000 + Math.random() * 900000)

        const mailOptions = {
            from: "hasanmunir406@gmail.com",  
            to: email,  
            subject: "Password Reset OTP", 
            text: `Your OTP for password reset is: ${otp}`  
        }

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Nodemailer error:", err)
                return res.status(500).json({ error: "Error sending OTP email", details: err.message })
            }
            req.session.otp = otp

            res.status(200).json({ message: "OTP sent successfully", otp })
        })
    } 
    catch (error) {
        console.error("Error sending OTP:", error)
        res.status(500).json({ error: "Server error", details: error.message })
    }
}

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body

    if (otp != req.session.otp) {
        return res.status(400).json({ error: "Invalid OTP" })
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        const user = await UserModel.findOne({ email: email })

        if (!user) {
            return res.status(400).json({ error: "User not found" })
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            user._id, 
            { password: hashedPassword }, 
            { new: true }
        )

        req.session.otp = null

        res.status(200).json({ message: "Password updated successfully", user: updatedUser })
    } 
    catch (error) {
        console.error("Error updating password:", error)
        res.status(500).json({ error: "Error updating password", details: error.message })
    }
}

exports.changePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body

    if (!email || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Email and passwords are required' })
    }
    
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        const user = await UserModel.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: 'User not found' })
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Old Password doesn't match" })
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            user._id, 
            { password: hashedPassword }, 
            { new: true }
        )

        res.status(200).json({ message: "Password updated successfully", user: updatedUser })
    }
    catch (error) {
        console.error("Error changing password:", error)
        return res.status(500).json({ message: 'Error changing password', error: error.message })
    }
}

exports.profileFetch = async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email)
        const user = await UserModel.findOne({ email })
        if (!user) return res.status(404).json({ error: "User not found" })

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email
        })
    } 
    catch (err) {
        console.error("Error fetching profile:", err)
        res.status(500).json({ error: "Internal server error" })
    }
}