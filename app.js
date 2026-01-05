const  express = require('express')
const bcrypt = require('bcrypt')
const app = express()
const dotenv = require('dotenv')
dotenv.config()
const {rateLimit} = require('express-rate-limit') 
const cors = require('cors')
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

const helmet = require('helmet');
app.use(helmet());



let port = process.env.PORT 

let secretkey = process.env.SECRETKEY
let mongooseurl = process.env.MONGOURL

 async function connectDB() {
   await mongoose.connect(mongooseurl)
}



//creare a schema

let productSchema = new mongoose.Schema({
  title:{type:String,required:true},
  price:{type:Number,required:true},
  image:{type:String,required:true}
})

let usersschema = new mongoose.Schema({
  name:{type:String,required:true},
  email:{type:String,required:true},
  password:{type:String,required:true}
})

// create a model
const Productmodel = mongoose.model(`products`,productSchema)
const finalusers = mongoose.model(`registers`,usersschema)


const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: .
})

app.use(limiter)
app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  console.log(`logic veified`)
  next()
})






app.get( `/`,(req,res)=>{
    res.json({
      msg:"server is runing"
    })
})
//requesting all products from postman
app.post("/products", async (req, res) => {
  try {
    const { title, price, image } = req.body;
    await Productmodel.create({ title, price, image });
    res.status(201).json({ msg: "Product added successfully" });
  } catch (err) {
    res.json({
      msg: err.message,
    });
  }
});


app.get("/products", async (req, res) => {
  try {
    let products = await Productmodel.find();
    res.json({ products });
  } catch (err) {
    res.json({
      msg: err.message,
    });
  }
});


app.delete(`/products`, async (req, res) => {
  try {
    let product = await Productmodel.findByIdAndDelete(req.params.id);
    res.json({ product });
     res.status(200).json({ msg: "Product deleted successfully" });
  } catch (err) {
    res.json({
      msg: err.message,
    });
  } 
})
app.post(`/register`, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    // Save the user to the databases
    let user = await finalusers.findOne({ email });
    if (user ) 
      return res.status(400).json({ msg: "User already exists" });
    
  await finalusers.create({ name, email, password: hashedPassword });
    res.status(200).json({ msg: "User registered successfully" });
  } catch (err) {
    res.json({
      msg: err.message,
    });
  }
});
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Email configuration
const mailOptions = {
  from: process.env.GMAIL_USER,
  to: "badigermallikarjun410@gmail.com",
  subject: "Test Email from Gmail",
  text: "Hello! This is a test email sent through Gmail using Nodemailer.",
  html: `
    <h2>Hello from rohan!</h2>
  `,
};

console.log("📧 Sending email...");

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log("❌ Error occurred:", error.message);
  } else {
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  }
});


//login

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let users = await finalusers.findOne({ email });
    if (!users) return res.status(400).json({ msg: "Invalid credentials" });   
    let checkPassword = await bcrypt.hash(password, 10);
    if (!checkPassword) return res.status(400).json({ msg: "Invalid credentials" });
    let playload = {email:email}
    let token = jwt.sign(playload,secretkey,{expiresIn:"1h"})
    res.status(200).json({ token });
    // const isMatch = await bcrypt.compare(password, users.password);
    // if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });   
    // const token = jwt.sign({ userId: users._id }, secretkey, { expiresIn: "1h" });
    // res.status(200).json({ token });
  } catch (err) {
    res.json({
      msg: err.message,
    });
  }
})


app.listen(port,async () => {
    console.log(`Example app listening on port ${port}`)
    connectDB();
    console.log(`DB connected`)
  
  //  let finalproduct = await Productmodel.findById("69575cc76c6b87b62318358e")
  // let finalproduct = await Productmodel.findByIdAndDelete("69575cc76c6b87b62318358e")
  // let finalproduct = await Productmodel.findByIdAndUpdate("69575cc76c6b87b62318358e",{title:"premium watch"})



})


// Gmail SMTP configuration
