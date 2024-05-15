import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    complete: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subTodos: [
      {
        type: mongoose.Schema.types.ObjectId,
        ref: "SubTodo",
      },
    ], //Array of SubTodos
  },
  { timestamps }
);

export const Todo = mongoose.model("Todo", todoSchema);
