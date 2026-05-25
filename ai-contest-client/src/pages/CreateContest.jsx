import { useState } from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ContestListContext } from "../context/ContestList";
import { SocketContext } from "../context/SocketContext";
import { useEffect } from "react";
import { RoomChatContext } from "../context/RoomChatContext";
import {SOCKET_EVENTS} from "../services/socket/socketevents/socketEvents";
function CreateContest() {
  const { setMessagesByRoom } = useContext(RoomChatContext);
  const { setContestList } = useContext(ContestListContext);
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    userId: user?.id, // from DB/auth later
    hostId: user?.id, // from DB/auth later
    hostName: "",
    context: "",
    roomName: "",
    status: "not-started",
  });

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log("Contest Data:", formData);
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API_URL}/api/create-contest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Contest created successfully:", data);
        const { message, ...contest } = data;
        //   navigate(`/contests/${data?.contestId || "56776"}`)
        socket.emit(SOCKET_EVENTS.EMIT.CREATE_CONTEST, contest);
        navigate(`/`);
        // setContestList((prevList) => [...prevList, contest]);
        // Optionally, navigate to the contest room or show a success message
      } else {
        console.error("Failed to create contest:", data);
        // Optionally, show an error message to the user
      }
    } catch (error) {
      console.error("Error during contest creation:", error);
      // Optionally, show an error message to the user
    }
  }

  useEffect(() => {
    function handleRoomMessage(data) {
      console.log("Received contest-message event with data:", data);

      setMessagesByRoom((prev) => {
        const roomMessages = prev[data?.contestId] || [];
        return {
          ...prev,
          [data?.contestId]: [...roomMessages, data],
        };
      });
    }
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED, (data) => {
      console.log("Status update received:", data);
    });
    socket.on(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleRoomMessage);

    return () => {
      socket.off(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleRoomMessage);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(circle_at_top,_#0f172a,_#000)] px-4 py-10">
      {/* Container */}
      <div className="mx-auto max-w-3xl rounded-3xl border border-cyan-500/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
        {/* Heading */}
        <div className="mb-10">
          <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
            Create Contest
          </h1>

          <p className="mt-3 text-gray-400">
            Fill the contest details to create a new contest room
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Host ID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Host ID
            </label>

            <input
              type="text"
              name="hostId"
              value={formData.hostId}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-gray-500 outline-none"
            />
          </div>

          {/* Host Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Host Name
            </label>

            <input
              type="text"
              name="hostName"
              placeholder="Enter host name"
              value={formData.hostName}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Room Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Room Name
            </label>

            <input
              type="text"
              name="roomName"
              placeholder="Enter room name"
              value={formData.roomName}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Contest Context */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Contest Context
            </label>

            <textarea
              name="context"
              rows="5"
              placeholder="Describe the contest..."
              value={formData.context}
              onChange={handleChange}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Status
            </label>

            <input
              type="text"
              value="not-started"
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 font-medium text-yellow-300 outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-bold text-black shadow-lg shadow-cyan-500/20 transition duration-300 hover:scale-[1.01] hover:shadow-cyan-400/40"
          >
            Create Contest
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateContest;