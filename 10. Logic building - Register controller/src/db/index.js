import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(

            "mongodb+srv://charu:charu@cluster0.4mv3pzl.mongodb.net/ytClone"
        )
        console.log(`\n MonoDB connected!! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection error: " + error);
        process.exit(1);
    }
}

export default connectDB;