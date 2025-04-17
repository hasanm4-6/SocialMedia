const mongoose = require("mongoose")

const postSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    imageUrl: { type: String, required: true },
    caption: { type: String, required: true },
    hashtags: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
    likesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true }, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

postSchema.virtual("comments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "post",
  })

const PostModel = mongoose.model("Post", postSchema)
module.exports = PostModel