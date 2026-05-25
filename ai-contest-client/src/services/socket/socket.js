import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BASE_API_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,       // connect manually when needed
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect" , ()=>{
  console.log("U R CONNECTED WITH ID --" , socket.id)
})





