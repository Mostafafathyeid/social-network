const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");

app.use(express.json());
app.use(cors())

mongoose.connect("mongodb://0.0.0.0:27017/Test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const authRoutes = require('./routes/authRoutes')
app.use('/auth', authRoutes)

app.listen(5000, console.log('server is running on port 5000'))