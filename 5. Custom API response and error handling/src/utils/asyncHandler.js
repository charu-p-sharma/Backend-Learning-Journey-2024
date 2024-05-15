
//This part of code is using the try-catch
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: error.message || "Server Error"
//         })
//     }
// }

const asyncHandler = (requestHandler) => {
    (re, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((error) => next(err))
    }
}

export default asyncHandler


