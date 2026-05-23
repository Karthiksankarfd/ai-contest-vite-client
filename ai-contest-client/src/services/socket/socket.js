import { io } from "socket.io-client";

export const socket = io(`${import.meta.env.VITE_BASE_API_URL}`, {
  auth: {
    token: localStorage.getItem("contest-app-token")
  },
});

socket.on("connection", () => {
  sessionStorage.setItem("socketId", socket.id);
  console.log(
    "You are connected to server with socket-id",
    socket.id
  );
});

socket.on("disconnect", () => {
  console.log("You have been disconnected from the server");
});