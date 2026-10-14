
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Browser B connected:", socket.id);

  socket.emit("user:join", {
    userId: "user_202",
    officeId: "office_1"
  });
});

socket.on("presence:update", (users) => {
  console.log("Browser B received presence:update:", users);
});

socket.on("user:left", (data) => {
  console.log("Browser B received user:left:", data);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});
