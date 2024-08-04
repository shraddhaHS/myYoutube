import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

//5 method
const generateAccessAndRefreshTokens = async (userId) => {
  try {
     const user = await User.findById(userId)
    const accessToken =  user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave:false})

    return {accessToken,refreshToken}
  } catch (error) {
    throw new ApiError(500,"something went wrong while generating refresh and access token")
  }
}



const registerUser = asyncHandler(async (req,res)=> {
   //1) get user details from frontend
   //2)validation - not empty fields
   //3)check if user already exists: check using username or email
   //4) check for images, check for avatar
   //5)upload them on cloudinary 
   //6) create user object - create entry in db
   //7)remove password and refresh token field from response
   //8)check for user creation
   //9)return res 
   
     const {fullname,email,username,password} = req.body //step 1
    
                         //step-2 validation
    //  if(fullname === ""){
    //   throw new ApiError(400,"full name is required")
    //  }

    //other method using array for validation of everything together
//Some: Determines whether the specified callback function returns true for any element of an array.
//Some/predicate: A function that accepts up to three arguments. The some method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value true, or until the end of the array.
    if(
      [fullname,email,username,password].some((field)=> field?.trim() === "")  
    ){
         throw new ApiError(400,"all fields are required")
    }
//step 3 check if the user exists
   const existedUser = await User.findOne({
      $or: [{username},{email}]
    })
    if(existedUser){
      throw new ApiError(409,"user with email or username already exists")
    }

  //step 4 avatar 
  //middleware multer req.files ka option dega instead of req.body jo express deta hai
 const avatarLocalPath = req.files?.avatar[0]?.path ; 
//  const coverImageLocalPath = req.files?.coverImage[0]?.path ; 
 let coverImageLocalPath;
 if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
   coverImageLocalPath = req.files.coverImage[0].path
 }

 if(!avatarLocalPath){
  throw new ApiError(400,"avatar file is required")
 }
 //step 5 upload on cloudinary
const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)
if(!avatar){
  throw new ApiError(400,"avatar file is required")
}
//step -6 create user object in db
const user = await User.create({
  fullname,
  avatar:avatar.url,
  coverImage: coverImage?.url || "",
  email,
  password,
  username: username.toLowerCase()

})
 //7)remove password and refresh token field from response
const createdUser = await User.findById(user._id).select(
  "-password -refreshToken" //string syntax to remove using - sign
)
  //8)check for user creation
if(!createdUser){
  throw new ApiError(500,"something went wrong while registering user")
}

return res.status(201).json(
  new ApiResponse(200,createdUser,"user registered successfully")
)


})

const loginUser = asyncHandler(async (req,res)=>{

  //1)req body -> data
  //2)username or email
  //3)find the user
  //4)password check
  //5)access and refresh token 
  //6)send cookie

//1
  const {email,username,password} = req.body
//2
  if(!username && !email){
    throw new ApiError(400,"username or password is required")
  }
//3
  const user = await User.findOne({
    $or: [{username},{email}]
  })
  if(!user){
    throw new ApiError(404,"user does not exist")
  }
//4
   const isPasswordValid = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new ApiError(401,"incorrect password")
  }
 //5
 const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

 //6
 const loggedInUser = await User.findById(user._id).
 select("-password -refreshToken")

 const options = {
  httpOnly: true,
  secure:true
 }
 return res
 .status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json(
     new ApiResponse(
      200,
      {
        user: loggedInUser,accessToken,refreshToken
      },
      "user logged in successfully"
     )
 )
})

//logout
const logoutUser = asyncHandler(async (req,res) => {
  await  User.findByIdAndUpdate(
    req.user._id,
    {
       $set: {
        refreshToken:undefined
      }
    },
     {
      new:true
    }
   )
   const options = {
    httpOnly: true,
    secure:true
   }
   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"user logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
   const incomingRefreshToken  =  req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorised request")
   }
 try {
    const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
   )
   const user= await User.findById(decodedToken?._id)
   if(!user){
     throw new ApiError(401,"invalid refresh token")
   }
   if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401,"refresh token is expired or used")
   }
 
   const options = {
     httpOnly:true,
     secure:true
   }
  const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",newRefreshToken,options)
  .json(
   new ApiResponse(200,
     {accessToken,refreshToken: newRefreshToken},
     "access token refreshed"
   )
  )
 } catch (error) {
    throw new ApiError(401,error?.message || "invalid refresh token")
 }

   
})

const changeCurrentPassword = asyncHandler( async ( req,res)=>{
   const {oldPassword,newPassword}= req.body
    const user= await User.findById(req.user?._id)
   const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password")
   }
   user.password = newPassword 
   await user.save({validateBeforeSave:false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req,res)=>{
  return res
  .status(200)
  .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
  const {fullname,email} = req.body
  if(!fullname || !email){
    throw new ApiError(400,"all field are reqd")
  }
const user = User.findByIdAndUpdate(
    req.user?._id,
    { $set: {
      fullname,
      email:email
    }},
    {new:true}
 ).select("-password")
 return res
 .status(200)
 .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async( req,res)=> {
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url){
    throw new ApiError(400,"error while uploading on avatar")
  }
 const user = await User.findByIdAndUpdate(
    req.user?.id,
    {
      $set : {
        avatar:avatar.url
      }
    },
    {new:true}
  ).select("-password")
  return res
  .status(200)
  .json(
    new ApiResponse(200,user,"avatar image updated successfully")
  )
})
const updateUserCoverImage = asyncHandler(async( req,res)=> {
  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400,"cover image file is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage.url){
    throw new ApiError(400,"error while uploading coverImage")
  }
  const user = await User.findByIdAndUpdate(
    req.user?.id,
    {
      $set : {
        coverImage:coverImage.url
      }
    },
    {new:true}
  ).select("-password")
   
  return res
  .status(200)
  .json(
    new ApiResponse(200,user,"cover image updated successfully")
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
} 