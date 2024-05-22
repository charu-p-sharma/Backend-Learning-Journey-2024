import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { upload } from "../middlewares/multer.middleware.js"
import jwt from "jsonwebtoken";
import { response } from "express";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found !")
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;  //the refresh token is stored in db
        await user.save({ validateBeforeSave: false })  //the refresh token is now saved in db and also validates as false means in the models it is a required field for password but here we are not making is required 

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Somethng went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //ALGORITHM FLOW
    //1.get user details from backend 
    //2.validation - not empty 
    //3.check if user is already registered: username,email
    //4.check for images , check for avatar
    //5.upload them to cloudinary server, avatar
    //6.create user object - create entry in db
    //7.remove password ad refresh token field from response
    //8.check for user creation
    //9.return response


    //1.get user details from backend 
    const { email, fullName, username, password } = req.body
    console.log(email);
    console.log(req.body);


    //2.validation - not empty 

    // if (fullName === "") {
    //     throw new ApiError(400, "Full name cannot be empty")
    // } this is a way to check the condition in if 

    //or this approach could also be used to check the condition
    if (
        [fullName, username, email, password].some((field) => { field?.trim() === "" })
    ) {
        throw new ApiError(400, "All fields are required")
    }

    //3.check if user is already registered: username,email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    console.log(req.files);

    //4.check for images , check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage > 0) {
    //     coverImageLocalPath = req.files?.coverImage[0].path
    // }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //5.upload them to cloudinary server, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage =
        await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //6.create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    //7.remove password ad refresh token field from response
    const createdUser = await User.findById(user._id).select( //here this select method allows to give the fields which will not be selected
        "-password -refreshToken"
    )


    //8.check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user ")
    }


    //9.return response
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"))


})

// use this if u are using multer-->const loginUser = asyncHandler(upload.single('avatar'), async (req, res) => {}
const loginUser = asyncHandler(async (req, res) => {
    //ALGORITHM FLOW
    //req body->data
    //username or email
    //find user
    //check password
    //access and refresh token
    //send cookies 
    //req body->data

    console.log("loginUser - req.body:", req.body);  // Add this line to log the request body

    //this is for login in frontend 
    const { email, username, password } = req.body

    //username or email validation
    if (!email || !username) {
        throw new ApiError(400, "Email or username is required")
    }


    //find user
    const user = await User.findOne(
        {
            $or: [
                { username },
                { email }
            ]
        }
    )

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    //check password if user exists
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }


    //access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    //user logged in
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    //send cookies 
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )



})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized access token")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true,
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
        return res
            .status(200)
            .cookie("accessToekn", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        }, { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading image")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        }, { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username.trim()) {
        throw new ApiError(400, "username is missing")
    }
    //AGGREGATION PIPELINES
    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User Channel profile fetched successfully"))


})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [{
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,
                                    coverImage: 1
                                }
                            }]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }

                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, user[0]?.watchHistory, "Watch History fetched successfully"))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory }




