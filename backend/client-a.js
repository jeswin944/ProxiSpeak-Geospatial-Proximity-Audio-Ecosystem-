
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Browser A connected:", socket.id);

  socket.emit("user:join", {
    userId: "user_101",
    officeId: "office_1"
  });

  setTimeout(() => {
    socket.emit("avatar:move", {
      userId: "user_101",
      officeId: "office_1",
      x: 250,
      y: 180
    });

    console.log("Browser A sent movement coordinates");
  }, 1000);
});

socket.on("presence:update", (users) => {
  console.log("Browser A received presence:update:", users);
});

socket.on("user:left", (data) => {
  console.log("Browser A received user:left:", data);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});
