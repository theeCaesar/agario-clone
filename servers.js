const express = require("express");
const app = express();
app.use(express.static(__dirname + "/public"));
const expressServer = app.listen(9000);
const socketio = require("socket.io");
const io = socketio(expressServer, {
  cors: {
    origin: ["http://localhost:3030"],
    credentials: true,
  },
});
const { instrument } = require("@socket.io/admin-ui");
// const bcrypt = require('bcrypt');

// bcrypt.genSalt(10, function(err, salt) {
//     bcrypt.hash('adminui', salt, function(err, hash) {
//         // Store hash in password DB. like mongo
//
//     });
// });

instrument(io, {
  auth: {
    type: "basic",
    username: "admin",
    password: "$2b$10$6/Cu3ozK3ECwVDwt5hXLruraFb9V8yy/zglypGbuxaelWN5GboHPy", // ill leave it cuz why not?
  },
  mode: "development",
});

module.exports = {
  app,
  io,
};
