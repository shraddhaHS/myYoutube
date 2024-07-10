const asyncHandler = (requestHandler) => {
    (req,res,next)=> {
        Promise.resolve(requestHandler)
        .catch((err)=> next(err))
    }
}


export {asyncHandler}

//high order functtion
// const asyncHandler = (fn) =>async (req,res,next)=> {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code||400).json({
//             succes:false,
//             message:err.message
//         })
//     }
// }