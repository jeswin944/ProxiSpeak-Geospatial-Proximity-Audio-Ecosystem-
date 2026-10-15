
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Client C connected:", socket.id);

  socket.emit("user:join", {
    userId: "user_303",
    officeId: "office_2"
  });
});

socket.on("presence:update", (users) => {
  console.log("Client C received presence:update:", users);
});

socket.on("user:left", (data) => {
  console.log("Client C received user:left:", data);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});
