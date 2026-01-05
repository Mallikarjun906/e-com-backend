

app.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    let users = await finaluser.findOne({ email });
    if (users) return res.status(400).json({ msg: "User already exists" });
    //hash password
    let hashedpassword = await bcrypt.hash(password, 10);
    finaluser.create({ email, username, password: hashedpassword });
    res.status(201).json({ msg: "User registered successfully" });

    let transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    let mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Registration Successful",
      html: `<h2>Welcome ${username}!</h2><p>Your registration was successful.</p>`,
    };

    transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("❌ Error occurred:", error.message);
      } else {
        console.log("✅ Email sent successfully!");
      }
    });
  } catch (err) {
    res.json({
      msg: err.message,
    });
  }
});