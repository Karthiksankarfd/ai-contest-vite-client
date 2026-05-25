import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ContestListContext } from "../context/ContestList";
import { SocketContext } from "../context/SocketContext";
import { RoomChatContext } from "../context/RoomChatContext";
import { AuthContext } from "../context/AuthContext";
import { SOCKET_EVENTS } from "../services/socket/socketevents/socketEvents";
import renderMessage from "../components/cards/RenderJobStatusCards";
import { ChatWindowContext } from "../context/ChatWindow";



function ContestRoom() {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const {eliminatedContestList , setEliminatedContestList} = useContext(ChatWindowContext)
  const { contestList, setContestList } = useContext(ContestListContext);
  const { messagesByRoom, setMessagesByRoom } = useContext(RoomChatContext);

  const [selectedContest, setSelectedContest] = useState(contestList?.[0] || null);
  const [submissions, setSubmissions] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);

  const scrollRef = useRef(null);

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  const currentRoomMessages = messagesByRoom?.[selectedContest?.contestId] || [];

  const allMessages = useMemo(() => {
    return [...submissions, ...currentRoomMessages];
  }, [submissions, currentRoomMessages]);

  const isHost = Number(selectedContest?.hostId) === Number(user?.id);

  const hasJoined = useMemo(() => {
    if (!selectedContest || !user) return false;
    return (selectedContest?.participants || []).some(
      (p) => Number(p?.participantId || p) === Number(user?.id),
    );
  }, [selectedContest, user]);

  function getStatusColor(status) {
    const normalized = status?.toLowerCase();
    switch (normalized) {
      case "live":
        return "border-green-500/30 bg-green-500/10 text-green-400";
      case "completed":
        return "border-red-500/30 bg-red-500/10 text-red-400";
      default:
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    }
  }

  function addMessageToRoom(roomId, message) {
    if (!roomId) return;
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: [...(prev?.[roomId] || []), message],
    }));
  }

  function updateContest(contestId, updater) {
    setContestList((prev) =>
      prev.map((contest) =>
        contest.contestId === contestId ? updater(contest) : contest,
      ),
    );
    setSelectedContest((prev) => {
      if (!prev || prev.contestId !== contestId) return prev;
      return updater(prev);
    });
  }

  // ─────────────────────────────────────────────
  // FETCH CONTESTS
  // ─────────────────────────────────────────────

  async function fetchContests() {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_API_URL}/api/contests`);
      const data = await response.json();
      if (!response.ok) { console.error(data); return; }

      const serialized = (data?.contests || []).map((contest) => ({
        ...contest,
        participants: contest?.participants || [],
      }));

      setContestList(serialized);
      if (!selectedContest && serialized?.length > 0) setSelectedContest(serialized[0]);
    } catch (err) {
      console.error("FETCH CONTEST ERROR => ", err);
    }
  }

  // ─────────────────────────────────────────────
  // JOIN CONTEST
  // ─────────────────────────────────────────────

  async function handleJoinContest(contest) {

    if (!contest || joiningId === contest?.contestId) return;
    
    setJoiningId(contest.contestId);

    socket.emit(SOCKET_EVENTS.EMIT.JOIN_ROOM, { ...contest, participantId: user?.id , email:user?.email });

    updateContest(contest.contestId, (prev) => {
      const participants = prev?.participants || [];
      const alreadyJoined = participants.some(
        (p) => Number(p?.participantId || p) === Number(user?.id),
      );
      if (alreadyJoined) return prev;
      return { ...prev, participants: [...participants, { participantId: user?.id }] };
    });

    setJoiningId(null);
  }

  // ─────────────────────────────────────────────
  // START / STOP CONTEST
  // ─────────────────────────────────────────────

  function handleStartStop(contest) {
    if (!contest) return;
    const normalized = contest?.status?.toLowerCase();
    if (normalized === "not-started") {
      socket.emit(SOCKET_EVENTS.EMIT.START_CONTEST, { contestId: contest.contestId });
    } else {
      socket.emit(SOCKET_EVENTS.EMIT.END_CONTEST, { contestId: contest.contestId });
    }
  }

  // ─────────────────────────────────────────────
  // SEND PROMPT
  // ─────────────────────────────────────────────

  function handleSendMessage() {
    if (!prompt.trim() || !selectedContest) return;
    socket.emit(SOCKET_EVENTS.EMIT.SUBMIT_PROMPT, {
      contestId: selectedContest?.contestId,
      prompt,
      user,
      participantId: user?.id,
      time: new Date().toLocaleTimeString(),
    });
    setPrompt("");
  }

  // ─────────────────────────────────────────────
  // FETCH SUBMISSIONS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!selectedContest?.contestId) return;

    async function fetchSubmissions() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(
          `${import.meta.env.VITE_BASE_API_URL}/api/contest-submissions/${selectedContest?.contestId}`,
        );
        const data = await response.json();
        if (!data?.success) throw new Error(data?.message);
        setSubmissions(data?.submissions || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch submissions.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, [selectedContest?.contestId]);

  // ─────────────────────────────────────────────
  // AUTO SCROLL
  // ─────────────────────────────────────────────

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  // ─────────────────────────────────────────────
  // SOCKET EVENTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    fetchContests();

    const handleUserJoined = (data) => {
      updateContest(data?.contestId, (prev) => {
        const participants = prev?.participants || [];
        const exists = participants.some(
          (p) => Number(p?.participantId || p) === Number(data?.participantId),
        );
        if (exists) return prev;
        return { ...prev, participants: [...participants, { participantId: data?.participantId }] };
      });
      addMessageToRoom(data?.contestId, {
        ...data,
        sentBy: "server",
        event: "user-joined",
        status: `user ${data?.email} joined the contest`,
      });
    };

    const handleNewMessage = (data) => addMessageToRoom(data?.contestId, data);

    const handleJobUpdate = (data) => {
      addMessageToRoom(data?.contestId, {
        contestId: data?.contestId,
        prompt: data?.prompt,
        sentBy: "server",
        participantId: data?.user?.id,
        output: data?.output || null,
        status: data?.status,
        event: data?.status,
        userId: data?.user?.id,
        email: data?.user?.email,
        time: new Date().toLocaleTimeString(),
      });
    };

    const handleContestCreated = (data) => setContestList((prev) => [...prev, data?.payload]);

    const handleContestStarted = (data) => {
      updateContest(data?.contestId, (prev) => ({ ...prev, status: "live" }));
      // let updatedList = contestList?.map((contest)=> contest.contestId === data?.contestId ? {...contest , status:"live"} : contest)
      // setContestList(updatedList);
      addMessageToRoom(data?.contestId, { ...data, event: "contest-started", status: "contest-started" });
    };

    const handleContestEnded = (data) => {
      updateContest(data?.contestId, (prev) => ({ ...prev, status: "contest-ended" }));
      // let updatedList = contestList?.map((contest)=> contest.contestId === data?.contestId ? {...contest , status:"contest-ended"} : contest);
      // setContestList(updatedList);
      addMessageToRoom(data?.contestId, { ...data, event: "contest-ended" });
    };

    const handleRankUpdate = (data) => addMessageToRoom(data?.contestId, data);
    const handleScoreUpdate = (data) => addMessageToRoom(data?.contestId, data);
    const handleJobFailed = (data) => addMessageToRoom(data?.contestId, data);

    const handleElimination = (data) => {
        addMessageToRoom(data?.contestId , data)
        if(data?.participantId === user?.id || data?.userId === user?.id){
          let list = JSON.parse(localStorage.getItem("contest-app-elimation-list"))
          if(list){
            list.push(data?.contestId)
            setEliminatedContestList(new Set(list))
          }else{
            list = [data?.contestId]
            localStorage.setItem( "contest-app-elimation-list" ,  JSON.stringify(list))
            setEliminatedContestList(new Set(list))
          }
        }
    }

    socket.on(SOCKET_EVENTS.LISTEN.SCORE_UPDATE ,handleScoreUpdate)
    socket.on(SOCKET_EVENTS.LISTEN.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleNewMessage);
    socket.on(SOCKET_EVENTS.LISTEN.JOB_UPDATE, handleJobUpdate);
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED, handleContestCreated);
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_STARTED, handleContestStarted);
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_ENDED, handleContestEnded);
    socket.on(SOCKET_EVENTS.LISTEN.RANK_UPDATE, handleRankUpdate);
    socket.on(SOCKET_EVENTS.LISTEN.USER_ELIMINATED , handleElimination)
    socket.on(SOCKET_EVENTS.LISTEN.JOB_FAILED, handleJobFailed);

    return () => {
      socket.off(SOCKET_EVENTS.LISTEN.USER_ELIMINATED , handleElimination)
      socket.off(SOCKET_EVENTS.LISTEN.SCORE_UPDATE, handleScoreUpdate)
      socket.off(SOCKET_EVENTS.LISTEN.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleNewMessage);
      socket.off(SOCKET_EVENTS.LISTEN.JOB_UPDATE, handleJobUpdate);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED, handleContestCreated);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_STARTED, handleContestStarted);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_ENDED, handleContestEnded);
      socket.off(SOCKET_EVENTS.LISTEN.RANK_UPDATE, handleRankUpdate);
      socket.off(SOCKET_EVENTS.LISTEN.JOB_FAILED, handleJobFailed);
    };

  }, []);

  // ─────────────────────────────────────────────
  // RENDER MESSAGE CARD
  // ─────────────────────────────────────────────



  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
<div className="contest-root flex h-screen w-full flex-col gap-4 overflow-hidden bg-[#0b1120] p-3 text-white lg:flex-row lg:p-5">

  {/* ═══ SIDEBAR ═══ */}
  <aside className="contest-sidebar flex h-[35vh] w-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl lg:h-full lg:w-[320px] lg:min-w-[320px]">

    {/* HEADER */}
    <div className="contest-sidebar__header mb-4">
      <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-extrabold text-transparent">
        Contests
      </h1>
      <p className="mt-1 text-xs text-gray-400">
        Active contest rooms
      </p>
    </div>

    {/* LIST */}
    <div className="contest-sidebar__list custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">

      {contestList?.length !== 0 ? (
        contestList?.map((contest) => (
          <div
            key={contest?.contestId}
            onClick={() => setSelectedContest(contest)}
            className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
              selectedContest?.contestId === contest?.contestId
                ? "border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                : "border-white/10 bg-white/[0.03] hover:border-cyan-400/20 hover:bg-white/[0.06]"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-white">
                  {contest?.roomName}
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  by {contest?.hostName}
                </p>
              </div>

              <span
                className={`flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${getStatusColor(
                  contest?.status
                )}`}
              >
                {contest?.status}
              </span>
            </div>

            <p className="line-clamp-2 text-xs text-gray-400">
              {contest?.context}
            </p>
          </div>
        ))
      ) : (
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 p-4 text-sm font-medium text-white shadow-lg">
          <h1>
            <span className="text-lg font-extrabold">
              No Contest Available
            </span>
            <br />
            Hit the Create Contest Button On the Top To Create One
          </h1>
        </div>
      )}
    </div>
  </aside>

  {/* ═══ MAIN PANEL ═══ */}
  <div className="contest-main relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">

    {/* HEADER */}
    <header className="border-b border-white/10 p-4">

      {selectedContest ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">
            <h1 className="truncate bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-2xl font-extrabold text-transparent">
              {selectedContest?.roomName}
            </h1>

            <p className="mt-1 line-clamp-2 text-sm text-gray-400">
              {selectedContest?.context}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {isHost ? (
              <button
                onClick={() => handleStartStop(selectedContest)}
                disabled={["completed","ended","contest-ended"].includes(
                  selectedContest?.status?.toLowerCase()
                )}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all ${
                  selectedContest?.status?.toLowerCase() === "not-started"
                    ? "bg-green-600 hover:bg-green-500"
                    : ["completed", "ended" , "contest-ended"].includes(
                        selectedContest?.status?.toLowerCase()
                      )
                    ? "cursor-not-allowed bg-gray-600"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {selectedContest?.status?.toLowerCase() ===
                "not-started"
                  ? "Start Contest"
                  : ["completed", "ended" , "contest-ended"].includes(
                      selectedContest?.status?.toLowerCase()
                    )
                  ? "Contest Ended"
                  : "Stop Contest"}
              </button>
            ) : hasJoined ? (
              <span className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-400">
                ✓ Joined
              </span>
            ) : (
              <button
                onClick={() =>
                  handleJoinContest(selectedContest)
                }
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
              >
                Join Contest
              </button>
            )}

            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusColor(
                selectedContest?.status
              )}`}
            >
              {selectedContest?.status}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">
          Select a contest to get started
        </p>
      )}
    </header>

    {/* MESSAGES */}
    <main className="contest-main__messages custom-scrollbar flex-1 overflow-y-auto p-4">

      {loading ? (
        <div className="flex h-full items-center justify-center text-gray-400">
          Loading…
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center text-red-400">
          {error}
        </div>
      ) : allMessages?.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-500">
          No messages yet
        </div>
      ) : (
        <div className="space-y-4">
          {allMessages.map((msg, idx) =>
            renderMessage(msg, idx , selectedContest , user)
          )}
        </div>
      )}

      <div ref={scrollRef} />
    </main>

    {/* INPUT */}
    <footer className="border-t border-white/10 p-4">

      {!selectedContest ? (
        <p className="text-sm text-gray-500">
          Select a contest
        </p>
      ) : isHost ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          👑 You're the host — submission disabled
        </div>
      ) : !hasJoined ? (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-gray-400">
            Join contest first
          </p>

          <button
            onClick={() =>
              handleJoinContest(selectedContest)
            }
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
          >
            Join Now
          </button>
        </div>
      ) : selectedContest?.status?.toLowerCase() ===
        "not-started" ? (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Waiting for host to start the contest…
        </div>
      ) : selectedContest?.status?.toLowerCase() ===
        "completed" ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-500">
          Contest has ended
        </div>
      ) : (
         eliminatedContestList.has(selectedContest?.contestId) ? (
         <>
          <div>Your are eliminated Cannot Participate anymore</div>
         </>
         ):
         (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          <input
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleSendMessage()
            }
            type="text"
            placeholder="Enter your prompt…"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-cyan-500/40"
          />

          <button
            onClick={handleSendMessage}
            disabled={!prompt.trim()}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-bold text-black transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </div>
         )
      )}
    </footer>
  </div>
</div>
  );
}

export default ContestRoom;