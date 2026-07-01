import mongoose from 'mongoose';
import dotenv from "dotenv";
import colors from "colors";

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }
    const conn = await mongoose.connect(dbUrl);
    console.log(
      colors.blue(
        colors.underline(`You successfully connected to MongoDB! \n ${conn.connection.host}`)
      )
    );
  } catch (error: any) {
    console.log(colors.red(`Error: ${error.message}`));
    process.exit(1);
  }
};
export default connectDB;
