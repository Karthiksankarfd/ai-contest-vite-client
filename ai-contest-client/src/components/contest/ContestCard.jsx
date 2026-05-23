import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";
import { SocketContext } from "../../context/SocketContext";

function ContestCard({ contest = {} }) {
  console.log("Rendering ContestCard with contest data:", contest);
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  async function handleJoinContest(contestId , hostId, roomName) {
    // Implement join contest logic here, e.g., navigate to contest room or emit socket event
    console.log("Join contest button clicked for contest:", contest);

    if(!contestId || !hostId || !user ){
        console.error("required params are missing" , contestId , hostId , user )
    } ;
    // Example: Emit a socket event to join the contest room
    await socket.emit("join-room", {
      contestId,
      hostId,
      participantId : user?.id,
      roomName
    });
    document.getElementById(contestId).innerHTML = "Joined"
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-[#050816] via-[#0b1120] to-black p-4 shadow-xl shadow-cyan-500/10 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-500/20">
      {/* Glow */}
      <div className="absolute inset-0 -z-10 bg-cyan-500/5 blur-2xl"></div>

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-2xl font-extrabold text-transparent">
            {contest?.roomName || "Weekly Coding Contest"}
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Room:{" "}
            <span className="text-cyan-400">
              {contest?.roomName || "alpha-room"}
            </span>
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            contest?.status === "live"
              ? "border border-green-500/20 bg-green-500/10 text-green-400"
              : contest.status === "completed"
                ? "border border-red-500/20 bg-red-500/10 text-red-400"
                : "border border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
          }`}
        >
          {contest?.status || "not-started"}
        </span>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Contest ID
            </p>

            <h3 className="mt-1 text-sm font-bold text-white">
              {contest?.contestId || "CNT-2026-001"}
            </h3>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Host
            </p>

            <h3 className="mt-1 text-sm font-bold text-cyan-400">
              {contest?.hostName || "Karthikeyan"}
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Context
          </p>

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-300">
            {contest?.context ||
              "Create the most insane luxury cyberpunk perfume campaign for Gen-Z."}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Created
            </p>

            <h3 className="mt-1 text-xs font-semibold text-white">
              {contest?.createdAt || "20 May 2026"}
            </h3>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Ends
            </p>

            <h3 className="mt-1 text-xs font-semibold text-white">
              {contest?.endedAt || "21 May 2026"}
            </h3>
          </div>
        </div>

        {/* Join Button */}
        {console.log("User ID:", user?.id, "Host ID:", contest?.hostId) ||
        user?.id === contest?.hostId ? (
          <p className="mt-1 text-sm text-gray-400">
            You are the host of this contest. Join to manage your contest room
            and interact with participants.
          </p>
        ) : (
          <button id={ `${contest?.contestId}`}
           onClick={()=>handleJoinContest(contest?.contestId  , contest?.hostId, contest?.roomName)}
            disabled={user?.id === contest?.hostId}
            className={`mt-1 rounded-xl py-3 text-sm font-extrabold transition duration-300 ${
              user?.id === contest?.hostId
                ? "cursor-not-allowed bg-gray-700 text-gray-400 opacity-60"
                : "bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/20 hover:scale-[1.02] hover:shadow-cyan-400/40"
            }`}
          >
            
            {user?.id === contest?.hostId ? "Your Contest" : ( contest?.participants?.includes(user?.id) ? "Joined" : "Join Contest" )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ContestCard;
