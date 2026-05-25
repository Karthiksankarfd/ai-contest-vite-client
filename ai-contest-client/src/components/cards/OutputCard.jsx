import { useState } from "react";
import { SOCKET_EVENTS } from "../../services/socket/socketevents/socketEvents";
import { socket } from "../../services/socket/socket";
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";
import { ChatWindowContext } from "../../context/ChatWindow";

function SubmissionCard({message, hostId , currentUserEmail, maxRank = 3, onSubmitRank}) {

  const { user } = useContext(AuthContext)
  const [rank, setRank] = useState("");
  const [score, setScore] = useState("");
  const {eliminatedContestList} = useContext(ChatWindowContext)

  const handleScoreSubmit = (submission) => {
    console.log("Update Score:", score , submission );
    socket.emit(SOCKET_EVENTS.EMIT.UPDATE_SCORE, { ...submission , score:score})
  };

  const handleEliminate = (user) => {
    console.log("User Eliminated");
    socket.emit(SOCKET_EVENTS.EMIT.ELIMINATE_USER , user)
  };
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
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-black/70 p-3 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
            <div className="w-full max-w-xs rounded-2xl border border-cyan-500/20 bg-[#081120] p-4 shadow-[0_0_30px_rgba(0,255,255,0.10)]">
              
              {/* Title */}
              <h2 className="mb-3 text-sm font-bold text-white">
                Manage Participant
              </h2>

              {/* User Info */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-500">
                  Participant
                </p>

                <p className="mt-1 truncate text-xs font-semibold text-cyan-300">
                  {message?.email || "Unknown User"}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {/* Rank */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">
                      Rank
                    </p>

                    {(message?.rank || message?.participantRank) ? (
                      <div className="mt-1 inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-bold text-green-400">
                        #{message?.rank || message?.participantRank}
                      </div>
                    ) : (
                      <div className="mt-1 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">
                        Not Ranked
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">
                      Score
                    </p>

                    <div className="mt-1 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
                      {message?.score || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                
                {/* Score */}
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
                    Score
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={score}
                    placeholder="Score"
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition-all focus:border-cyan-400/40"
                  />
                </div>

                {/* Rank */}
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">
                    Rank
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={maxRank}
                    value={rank}
                    placeholder="Rank"
                    onChange={handleRankChange}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition-all focus:border-cyan-400/40"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                
                <button
                  onClick={()=>handleScoreSubmit(message)}
                  className="rounded-lg bg-cyan-400 py-2 text-[10px] font-bold text-black transition-all hover:scale-[1.02]"
                >
                  Score
                </button>

                <button
                  onClick={()=>handleSubmit(message)}
                  className="rounded-lg bg-green-500 py-2 text-[10px] font-bold text-black transition-all hover:scale-[1.02]"
                >
                  Rank
                </button>
                    
                
                <button
                  onClick={()=>handleEliminate(message)}
                  className="rounded-lg bg-red-500 py-2 text-[10px] font-bold text-white transition-all hover:scale-[1.02]"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  );
}

export default SubmissionCard;