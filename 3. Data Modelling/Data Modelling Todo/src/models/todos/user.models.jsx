import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
  },
  { timestamps: true }
); //first object is taking the data and the other objectsis having the timestamps as it has builtin methods declared in the mongoose for declaring the createdAt() updatedAt()

export const User = mongoose.model("User", userSchema);
