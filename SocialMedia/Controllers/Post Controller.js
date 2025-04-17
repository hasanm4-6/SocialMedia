const PostModel = require("../Models/Post Model")
const { CommentModel, ReplyModel } = require("../Models/Comment Model")
const UserModel = require("../Models/User Model")
const mongoose = require("mongoose")
const io = require('../../ServerSM') 

exports.uploadPost = async (req, res) => {
    try {
        const userId = req.user.id 
        const { caption, hashtags } = req.body

        if (!req.file) {
            return res.status(400).json({ message: "No image uploaded" })
        }

        const imageUrl = `/Posts/${req.file.filename}`

        const newPost = new PostModel({ user: userId, imageUrl, caption, hashtags })
        await newPost.save()

        res.status(201).json({ message: "Post uploaded successfully", post: newPost })
    } 
    catch (error) {
        console.error("Uploading Post Error:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

async function getNestedReplies(parentId) {
    const replies = await ReplyModel.find({ parentComment: parentId })
    .populate("user", "name email")
    .lean()

    for (let reply of replies) {
        reply.replies = await getNestedReplies(reply._id)
    }

    return replies
}

exports.getAllPosts = async (req, res) => {
    try {
        const posts = await PostModel.find()
            .populate("user", "name email")
            .lean()
            .sort({ createdAt: -1 })

        const postsWithComments = await Promise.all(
            posts.map(async (post) => {
                const topLevelComments = await CommentModel.find({ post: post._id, parentComment: null })
                .populate("user", "name email")
                .lean()

                const commentsWithReplies = await Promise.all(
                    topLevelComments.map(async (comment) => {
                        comment.replies = await getNestedReplies(comment._id)  
                        return comment
                    })
                )

                post.commentCount = commentsWithReplies.length

                return { ...post, comments: commentsWithReplies }
            })
        )

        res.json(postsWithComments) 
    } 
    catch (error) {
        console.error("Error fetching posts:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

exports.toggleLike = async (req, res, io) => {
    try {
        const { userId } = req.body
        const { postId } = req.params

        if (!userId) return res.status(400).json({ message: "User ID is required in the ServerSide" })

        const post = await PostModel.findById(postId)
        if (!post) return res.status(404).json({ message: "Post not found" })

        const isLiked = post.likes.includes(userId)

        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== userId)
            post.likesCount -= 1
        } 
        else {
            post.likes.push(userId)
            post.likesCount += 1
        }

        await post.save()

        io.emit('postLiked', {
            postId: post._id,
            likesCount: post.likesCount,
            isLiked: !isLiked 
        })

        return res.status(200).json({
            message: isLiked ? "Post unliked" : "Post liked",
            likesCount: post.likesCount 
        })

    } 
    catch (error) {
        console.error("Like Dislike Post Error:", error)
        res.status(500).json({ message: "Server error", error: error.message }) 
    }
}

exports.addCommentOrReply = async (req, res, io) => {
    try {
        const { postId, parentCommentId, parentReplyId, userId, userName, text } = req.body

        if (!parentCommentId) {
            const newComment = new CommentModel({
                post: postId,
                user: userId,
                userName,
                text,
                parentComment: null
            })
            await newComment.save()

            io.emit("newComment", {
                postId,
                comment: {
                    _id: newComment._id,
                    userName,
                    text,
                    createdAt: newComment.createdAt
                }
            })

            return res.status(201).json({ message: "Comment added", comment: newComment })
        }

        if (parentReplyId) {
            const parentReply = await ReplyModel.findById(parentReplyId)
            if (!parentReply) {
                return res.status(404).json({ message: "Parent reply not found in ServerSide" })
            }

            const newReply = new ReplyModel({
                parentComment: parentReply.parentComment,
                parentReply: parentReplyId,
                user: userId,
                userName,
                text,
                createdAt: new Date()
            })
            await newReply.save()

            io.emit("newReply", {
                postId,
                parentCommentId: parentReply.parentComment,
                parentReplyId,
                reply: {
                    _id: newReply._id,
                    userName,
                    text,
                    createdAt: newReply.createdAt
                }
            })

            return res.status(201).json({ message: "Reply to reply added", reply: newReply })
        } else {
            const parentComment = await CommentModel.findById(parentCommentId)
            if (!parentComment) return res.status(404).json({ message: "Parent comment not found in the ServerSide" })

            const newReply = new ReplyModel({
                parentComment: parentCommentId,
                parentReply: null,
                user: userId,
                userName,
                text,
                createdAt: new Date()
            })
            await newReply.save()

            io.emit("newReply", {
                postId,
                parentCommentId,
                reply: {
                    _id: newReply._id,
                    userName,
                    text,
                    createdAt: newReply.createdAt
                }
            })

            return res.status(201).json({ message: "Reply added", reply: newReply })
        }
    } catch (err) {
        console.error("Error in addCommentOrReply:", err)
        res.status(500).json({ message: "Server error", error: err.message })
    }
}

exports.commentsRepliesToggleLikes = async (req, res, io) => {
    try {
        const { type, id, userId } = req.body
    
        if (type === "comment") {
            const comment = await CommentModel.findById(id)
            if (!comment) return res.status(404).json({ message: "Comment not found" })
    
            const alreadyLiked = comment.likes.includes(userId)
    
            if (alreadyLiked) {
                comment.likes.pull(userId)
                comment.likesCount--
            } else {
                comment.likes.push(userId)
                comment.likesCount++
            }
    
            await comment.save()
    
            io.emit("commentLikeUpdate", {
                type: "comment",
                id: comment._id,
                likesCount: comment.likesCount,
                likes: comment.likes 
            })

            return res.status(200).json({ message: "Comment like toggled", liked: !alreadyLiked })
        }
    
        if (type === "reply") {
            const reply = await ReplyModel.findById(id)
            if (!reply) return res.status(404).json({ message: "Reply not found" })

            const alreadyLiked = reply.likes.includes(userId)
    
            if (alreadyLiked) {
                reply.likes.pull(userId)
                reply.likesCount--
            } 
            else {
                reply.likes.push(userId)
                reply.likesCount++
            }
    
            await reply.save()
    
            io.emit("commentLikeUpdate", {
                type: "reply",
                id: reply._id,
                likesCount: reply.likesCount,
                likes: reply.likes 
            })

            return res.status(200).json({ message: "Reply like toggled", liked: !alreadyLiked })
        }
    
        res.status(400).json({ message: "Invalid type" })
    } 
    catch (err) {
        console.error("Error in toggleLike:", err)
        res.status(500).json({ message: "Server error", error: err.message })
    }
}