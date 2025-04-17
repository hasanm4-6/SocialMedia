const express = require("express")
const multer = require("multer")
const path = require("path")
const { uploadPost, getAllPosts, toggleLike, addCommentOrReply, commentsRepliesToggleLikes } = require("../Controllers/Post Controller")
const authenticateUser = require('../Middleware/User Auth')

const router = express.Router()

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "Posts/") 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname)
    }
})

const upload = multer({ storage })

router.post("/upload", authenticateUser, upload.single("image"), uploadPost)
router.get("/", getAllPosts) 
router.post("/toggle-like/:postId", authenticateUser, (req, res) => {
    toggleLike(req, res, req.app.get('io'))  
})
router.post("/comment/reply", authenticateUser, (req, res) => {
    addCommentOrReply(req, res, req.app.get("io"))
})
router.post("/comment/like", authenticateUser, (req, res) => {
    commentsRepliesToggleLikes(req, res, req.app.get("io"))
})

module.exports = router