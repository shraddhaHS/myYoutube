import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


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

export {registerUser}