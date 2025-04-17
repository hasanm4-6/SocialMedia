const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

const replySchema = new mongoose.Schema({
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: true }, 
    parentReply: { type: mongoose.Schema.Types.ObjectId, ref: "Reply", default: null }, 
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

commentSchema.virtual("replies", {
    ref: "Reply",
    localField: "_id",
    foreignField: "parentComment"
})

const CommentModel = mongoose.model("Comment", commentSchema)
const ReplyModel = mongoose.model("Reply", replySchema)

module.exports = { CommentModel, ReplyModel }
