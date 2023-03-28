const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const { Post, Comment } = require("../models/postModel");

const signUp = async (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  if (!name || !email || !password) {
    res.status(400).json("data is missing");
    return;
  }
  let data = await User.find({ email: email });
  if (data.length) {
    res.status(401).json("user already exist");
    return;
  }
  if (req.body.password !== req.body.password2) {
    res.status(400).json("Passwords must be equal");
    return;
  }
  bcrypt.hash(req.body.password, 10).then(async (hashed) => {
    try {
      let user = await User.create({
        name: name,
        email: email,
        password: hashed,
      });
    } catch {
      return res.status(400).json("Please enter all required fields");
    }
    res.status(200).json("signup sucessfully");
  });
};

const signIn = async (req, res) => {
  const data = await User.findOne({ email: req.body.email });
  if (!data) {
    return res.status(203).json("Email is not exist");
  }
  bcrypt.compare(req.body.password, data.password).then((same) => {
    if (!same) {
      return res.status(400).json("Password is not correct");
    }
    const token = jwt.sign(data.toJSON(), "HS256", {
      expiresIn: "24h",
    });
    res.status(200).json({ token: token });
  });
};

const sendRequest = async (req, res) => {
  const friendData = await User.findById(req.body.id);
  const myData = await User.findById(req.user._id);
  if (!friendData || !myData || req.id == req.user._id)
    return res.status(400).json("Invalid user");
  let sendTome = false,
    iSentToHim = false,
    alreadyFriend = false;
  myData.recievedRequests.map((item) => {
    if (item._id == req.body.id) sendTome = true;
  });
  myData.sentRequests.map((item) => {
    if (item._id == req.body.id) iSentToHim = true;
  });
  myData.connections.map((item) => {
    if (item._id == req.body.id) alreadyFriend = true;
  });
  if (sendTome)
    return res
      .status(400)
      .json("User has already sent connection request to you");
  if (iSentToHim)
    return res.status(400).json("Connection request is already sent");
  if (alreadyFriend)
    return res.status(400).json("User is already connected with you");
  myData.sentRequests.push(friendData._id);
  friendData.recievedRequests.push(myData._id);
  await myData.save();
  await friendData.save();
  res.status(200).json(myData);
};

const acceptRequest = async (req, res) => {
  console.log(req.body.id, req.user._id);
  const friendData = await User.findById(req.body.id);
  const myData = await User.findById(req.user._id);
  if (!friendData || !myData || req.id == req.user._id)
    return res.status(400).json("Invalid user");
  let sendTome = false;
  myData.recievedRequests.map((item) => {
    if (item._id == req.body.id) sendTome = true;
  });
  if (!sendTome) {
    return res.status(400).json("you don't recieve request");
  }
  let result = await User.findByIdAndUpdate(req.body.id, {
    $pull: { sentRequests: req.user._id },
    $push: { connections: req.user._id },
  });
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { recievedRequests: req.body.id },
    $push: { connections: req.body.id },
  });

  res.status(200).json(result);
};

const cancelRequest = async (req, res) => {
  const friendData = await User.findById(req.body.id);
  const myData = await User.findById(req.user._id);
  if (!friendData || !myData || req.id == req.user._id)
    return res.status(400).json("Invalid user");
  let sent = false;
  myData.sentRequests.map((item) => {
    if (item._id == req.body.id) sent = true;
  });
  if (!sent)
    return res
      .status(400)
      .json("You have not sent connection request to cancel");

  let result = await User.findByIdAndUpdate(req.user._id, {
    $pull: { sentRequests: req.body.id },
  });
  await User.findByIdAndUpdate(req.body.id, {
    $pull: { recievedRequests: req.user._id },
  });

  res.status(200).json(result);
};

const unFriend = async (req, res) => {
  const friendData = await User.findById(req.body.id);
  const myData = await User.findById(req.user._id);
  if (!friendData || !myData || req.id == req.user._id)
    return res.status(400).json("Invalid user");

  let tmm = false;
  myData.connections.map((item) => {
    if (item._id == req.body.id) tmm = true;
  });
  if (!tmm) res.status(400).json("You have not this connection");
  let result = await User.findByIdAndUpdate(req.user._id, {
    $pull: { connections: req.body.id },
  });
  await User.findByIdAndUpdate(req.body.id, {
    $pull: { connections: req.user._id },
  });

  res.status(200).json(result);
};

const getFriends = async (req, res) => {
  let temp = await User.find({});
  let result = [];
  temp.map((item) => {
    if (item._id != req.user._id) result.push(item);
  });
  res.json(result);
};

const createPost = async (req, res) => {
  let type = "",
    content = "test";
  if (req.file) {
    for (let i = 0; i < req.file.filename.length; ++i) {
      if (req.file.filename[i] >= "0" && req.file.filename[i] <= "9") continue;
      if (req.file.filename[i] == ".") continue;
      type += req.file.filename[i];
    }
  }
  let image = "",
    video = "";
  if (type == "jpg" || type == "png" || type == "JPEG" || type == "GIF")
    image = req.file.filename;
  else if (type == "mp4") video = req.file.filename;
  else if (type != "") {
    return res.status(400).json("this type is not supported");
  }
  await Post.create({
    writer: "641dbaf5bdc64215fc3edd05",
    content: content,
    image: image,
    video: video,
  });
  res.json("uploaded sucesfully");
};
const getPost = async (req, res) => {
  if (!req.user._id) return res.status(401).json("user is not authorized");
  let temp = [req.user._id];
  let users = await User.findById(req.user._id);
  users.connections.map((item) => {
    temp.push(item._id);
  });
  let answer = [];
  let posts = await Post.find({})
    .populate("writer", "-password")
    .populate("comments");
  posts.map((item) => {
    if (temp.includes(item.writer._id)) answer.push(item);
  });
  res.json(answer);
};
const addComment = async (req, res) => {
  if (!req.user._id) return res.status(401).json("user is not authorized");
  let comment = await Comment.create({
    content: req.body.content,
    writer: req.user._id,
  });
  await Post.findOneAndUpdate(
    { id: req.body.id },
    { $push: { comments: comment._id } }
  );
  res.status(200).json("comment added");
};
module.exports = {
  signUp,
  signIn,
  sendRequest,
  acceptRequest,
  cancelRequest,
  unFriend,
  getFriends,
  createPost,
  addComment,
  getPost,
};
