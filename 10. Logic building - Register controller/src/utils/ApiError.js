class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.errors = errors
        this.success = false
    }

    //Optional code
    // if(stack) {
    //     this.stack = stack
    // }else{
    // Error.captureStackTrace(this, this.constructor)}
}
export { ApiError } 