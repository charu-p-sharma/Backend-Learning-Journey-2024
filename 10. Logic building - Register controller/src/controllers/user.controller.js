import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage > 0) {
        coverImageLocalPath = req.files?.coverImage[0].path
    }

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
        username: username.toLowerCase().split(" ").join("_")
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

export { registerUser }