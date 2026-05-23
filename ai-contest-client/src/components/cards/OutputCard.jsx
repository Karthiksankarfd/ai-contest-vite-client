import { useState } from "react";
import { SOCKET_EVENTS } from "../../services/socket/socketevents/socketEvents";
import { socket } from "../../services/socket/socket";
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";

function SubmissionCard({message, hostId , currentUserEmail, maxRank = 3, onSubmitRank}) {
  const { user } = useContext(AuthContext)
    console.log(message , "This is from the host cards") 
  const [rank, setRank] = useState("");
  const isUserMessage = currentUserEmail === message?.email;
  const handleRankChange = (e) => {
    let value = e.target.value;
    if (value > maxRank) value = maxRank;
    if (value < 1 && value !== "") value = 1;
    setRank(value);
  };

  const handleSubmit = async () => {
    if (!rank) return;
    let msg = {...message , rank}
    console.log(msg)
    socket.emit(SOCKET_EVENTS.EMIT.RANK_USER, msg )
    onSubmitRank?.(msg);
    setRank("");
  };

  return (
    <div className={`group relative flex ${ isUserMessage ? "justify-end" : "justify-start"}`}>
      {/* ───────────────── MAIN CARD ───────────────── */}
      <div className={`relative max-w-xl overflow-hidden rounded-3xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 
        ${ isUserMessage
            ? "border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10"
            : "border-white/10 bg-white/[0.05]"
        }`}
      >
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isUserMessage ? "bg-cyan-400" : "bg-purple-400"
            }`}
          />

          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {isUserMessage ? "You" : message?.email || "Participant"}
          </p>
          <p>Rank</p>
      
          {message?.participants?.map((participant, index)=> <p key={index}>{participant?.participantRank}</p>)}
          <p>{message?.rank || message?.participantRank}</p>
        </div>

        {/* Prompt */}
        <p className="mb-4 text-sm leading-relaxed text-gray-200">
          {message?.prompt || "Loading Prompt..."}
        </p>

        {/* Image */}
        <img
          src={message?.output}
          alt="generated"
          className="h-72 w-full rounded-2xl border border-white/10 object-cover shadow-lg"
        />

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {message?.time || "Just now"}
          </p>

          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
            Generated
          </span>
        </div>

        {/* ───────────────── HOVER POPUP ───────────────── */}
        {hostId === user?.id &&
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-black/70 p-5 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/20 bg-[#081120] p-5 shadow-[0_0_40px_rgba(0,255,255,0.12)]">
            {/* Title */}
            <h2 className="mb-4 text-lg font-bold text-white">
              Rank User Output
            </h2>

            {/* User Info */}
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500">
                Participant
              </p>

              <p className="mt-1 text-sm font-semibold text-cyan-300">
                {message?.email || "Unknown User"}
              </p>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  Current Rank
                </p>

                {(message?.rank || message?.participantRank) ? (
                  <div className="mt-2 inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-sm font-bold text-green-400">
                    #{message?.rank || message?.participantRank}
                  </div>
                ) : (
                  <div className="mt-2 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-semibold text-yellow-300">
                    Not Ranked Yet
                  </div>
                )}
              </div>
            </div>

            {/* Rank Input */}
            <div className="mb-4">
              <label className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
                Give Rank (1 - {maxRank})
              </label>

              <input
                type="number"
                min={1}
                max={maxRank}
                value={rank}
                placeholder="Enter rank"
                onChange={handleRankChange}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition-all focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98]"
            >
              Submit Rank
            </button>
          </div>
        </div>
        }

      </div>
    </div>
  );
}

export default SubmissionCard;