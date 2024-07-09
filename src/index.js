// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js"

dotenv.config({
    path: './env'
})
connectDB()

//db se jb bhi communicate krneki koshish krte h toh errors aa hi skti h isliye try and catch ka use kro ya promises ka
//db is always in another continent so it will take time isliye async await use kro

// second approach



// first approach to connect to database
/*import express from "express"
const app = express()

(async ()=>{
    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on("Error",(error)=>{
        console.log("ERROR:",error);
        throw error
       })
       app.listen(process.env.PORT,()=>{
        console.log(`app is listening on port ${process.env.PORT}`)
       })
    }catch(error){
        console.error("ERROR:",error)
        throw err
    }
})() */