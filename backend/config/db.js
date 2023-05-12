import mongoose from 'mongoose';
import dotenv from "dotenv";

dotenv.config();
// console.log(process.env.DATABASE_URL);
const connectDB = async ()=>{
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
         console.log(
           `You successfully connected to MongoDB! \n ${conn.connection.host}`.blue.underline
         );
    } catch (error) {
        console.log(`Error: ${error.message}`.red);
        process.exit();
    }
}
export default connectDB;