const express = require('express')
const bcrypt = require('bcrypt')
const app = express()
require('dotenv').config()
const { rateLimit } = require('express-rate-limit')
const cors = require('cors')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const helmet = require('helmet')

app.use(helmet())
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
const SECRETKEY = process.env.SECRETKEY || 'changeme'
const MONGOURL = process.env.MONGOURL

async function connectDB() {
  if (!MONGOURL) {
    console.error('MONGOURL not set. Set process.env.MONGOURL')
    process.exit(1)
  }
  await mongoose.connect(MONGOURL)
}

// Schemas and models
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true }
})

const usersSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
})

const Productmodel = mongoose.model('Product', productSchema)
const finalusers = mongoose.model('Register', usersSchema)

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
})

app.use(limiter)

app.use((req, res, next) => {
  console.log('Request received:', req.method, req.path)
  next()
})

app.get('/', (req, res) => res.json({ msg: 'server is running' }))

// Products
app.post('/products', async (req, res) => {
  try {
    const { title, price, image } = req.body
    await Productmodel.create({ title, price, image })
    res.status(201).json({ msg: 'Product added successfully' })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
})

app.get('/products', async (req, res) => {
  try {
    const products = await Productmodel.find()
    res.json({ products })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
})

app.delete('/products/:id', async (req, res) => {
  try {
    const product = await Productmodel.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ msg: 'Product not found' })
    res.json({ msg: 'Product deleted successfully' })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
})

// Mail transporter (shared)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

// Register
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!email || !password || !name) return res.status(400).json({ msg: 'Missing fields' })
    let user = await finalusers.findOne({ email })
    if (user) return res.status(400).json({ msg: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, 10)
    await finalusers.create({ name, email, password: hashedPassword })
    res.status(201).json({ msg: 'User registered successfully' })

    // Send welcome email (fire-and-forget)
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Registration Successful',
      html: `<h2>Welcome ${name}!</h2><p>Your registration was successful.</p>`
    }
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('Email error:', err.message)
      else console.log('Signup email sent:', info.messageId)
    })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
})

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await finalusers.findOne({ email })
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' })

    const token = jwt.sign({ userId: user._id, email: user.email }, SECRETKEY, { expiresIn: '1h' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ msg: err.message })
  }
})

app.listen(PORT, async () => {
  console.log(`Example app listening on port ${PORT}`)
  try {
    await connectDB()
    console.log('DB connected')
  } catch (err) {
    console.error('DB connection failed:', err.message)
  }
})
