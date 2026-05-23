import { useContext, useEffect, useMemo, useRef, useState } from "react";

import { ContestListContext } from "../context/ContestList";
import { SocketContext } from "../context/SocketContext";
import { RoomChatContext } from "../context/RoomChatContext";
import { AuthContext } from "../context/AuthContext";

import { SOCKET_EVENTS } from "../services/socket/socketevents/socketEvents";

import SubmissionCard from "../components/cards/OutputCard";
import ChatPromptCard from "../components/cards/ChatPromptCard";

function ContestRoom() {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

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

    socket.emit(SOCKET_EVENTS.EMIT.JOIN_ROOM, { ...contest, participantId: user?.id });

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
        event: "User-Joined",
        status: `User ${data?.participantId} joined the contest`,
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
      addMessageToRoom(data?.contestId, { ...data, event: "Contest-Started", status: "Contest Started" });
    };

    const handleContestEnded = (data) => {
      updateContest(data?.contestId, (prev) => ({ ...prev, status: "completed" }));
      addMessageToRoom(data?.contestId, { ...data, event: "Contest-Ended" });
    };

    const handleRankUpdate = (data) => addMessageToRoom(data?.contestId, data);
    const handleJobFailed = (data) => addMessageToRoom(data?.contestId, data);

    socket.on(SOCKET_EVENTS.LISTEN.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleNewMessage);
    socket.on(SOCKET_EVENTS.LISTEN.JOB_UPDATE, handleJobUpdate);
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED, handleContestCreated);
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_STARTED, handleContestStarted);
    socket.on(SOCKET_EVENTS.LISTEN.CONTEST_ENDED, handleContestEnded);
    socket.on(SOCKET_EVENTS.LISTEN.RANK_UPDATE, handleRankUpdate);
    socket.on(SOCKET_EVENTS.LISTEN.JOB_FAILED, handleJobFailed);
    socket.on(SOCKET_EVENTS.LISTEN.ERROR, console.log);

    return () => {
      socket.off(SOCKET_EVENTS.LISTEN.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleNewMessage);
      socket.off(SOCKET_EVENTS.LISTEN.JOB_UPDATE, handleJobUpdate);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED, handleContestCreated);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_STARTED, handleContestStarted);
      socket.off(SOCKET_EVENTS.LISTEN.CONTEST_ENDED, handleContestEnded);
      socket.off(SOCKET_EVENTS.LISTEN.RANK_UPDATE, handleRankUpdate);
      socket.off(SOCKET_EVENTS.LISTEN.JOB_FAILED, handleJobFailed);
      socket.off(SOCKET_EVENTS.LISTEN.ERROR);
    };
  }, [socket]);

  // ─────────────────────────────────────────────
  // RENDER MESSAGE CARD
  // ─────────────────────────────────────────────

  function renderMessage(msg, idx) {
    const isSystemMessage = [
      "User-Joined",
      "Prompt-Queued",
      "Contest-Started",
      "Queuse-Processing-Prompt",
      "Contest-Ended",
    ].includes(msg?.event);

    const isImageGenerated = msg?.event === "Image-Generated";

    // ───────────────── RANK UPDATE CARD
    if (msg?.event === "Rank-Update") {
      return (
        <div
          key={idx}
          className="w-full max-w-md rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-4 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-lg">
              🏆
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-green-400">Rank Updated</h2>
              <p className="text-xs text-gray-400">Participant ranking updated</p>
            </div>
          </div>
          <div className="my-4 h-px bg-white/10" />
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-500">Participant</p>
              <p className="mt-1 text-sm font-semibold text-white">{msg?.email}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-500">Assigned Rank</p>
              <div className="mt-2 inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-4 py-1.5 text-sm font-bold text-green-300">
                #{msg?.participantRank || msg?.rank}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ───────────────── PROMPT QUEUED
    if (msg?.event === "Prompt-Queued") {
      return (
        <div key={idx}>
          <div className="mb-3 flex justify-center">
            <div className="max-w-md rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 shadow-lg backdrop-blur-sm">
              <p className="text-center text-sm font-medium tracking-wide text-cyan-300">
                {msg?.status || msg?.event}
              </p>
            </div>
          </div>
          <ChatPromptCard
            email={msg?.email}
            prompt={msg?.prompt}
            time={msg?.time}
            isCurrentUser={user?.email === msg?.user?.email}
          />
        </div>
      );
    }

    // ───────────────── CONTEST ENDED
    if (msg?.event === "Contest-Ended") {
      return (
        <div key={idx} className="flex justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#0b1020] via-[#111827] to-[#1e1b4b] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-3xl shadow-lg">
                🏆
              </div>
              <h1 className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
                Contest Ended
              </h1>
              <p className="mt-2 text-sm tracking-wide text-gray-400">
                Final rankings have been announced
              </p>
            </div>
            <div className="my-6 h-px bg-white/10" />
            <div className="space-y-4">
              {msg?.winners?.map((winner, index) => {
                const medals = ["🥇", "🥈", "🥉"];
                const borderColors = [
                  "border-yellow-500/30 bg-yellow-500/10",
                  "border-slate-400/30 bg-slate-400/10",
                  "border-orange-500/30 bg-orange-500/10",
                ];
                return (
                  <div
                    key={winner?.participantId}
                    className={`flex items-center justify-between rounded-2xl border p-4 shadow-lg ${borderColors[index] || "border-white/10 bg-white/[0.03]"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/20 text-2xl">
                        {medals[index] || "🏅"}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400">Participant</p>
                        <h2 className="text-lg font-bold text-white">User #{winner?.participantId}</h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-gray-400">Rank</p>
                      <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-1.5 text-lg font-extrabold text-white">
                        #{winner?.participantRank}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // ───────────────── SYSTEM MESSAGE
    if (isSystemMessage) {
      return (
        <div key={idx} className="flex justify-center">
          <div className="max-w-md rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-center text-sm font-medium tracking-wide text-cyan-300">
              {msg?.status || msg?.event}
            </p>
          </div>
        </div>
      );
    }

    // ───────────────── GENERATED IMAGE + NORMAL CARD
    return (
      <SubmissionCard
        key={idx}
        message={msg}
        hostId={selectedContest?.hostId}
        currentUserEmail={user?.email}
        maxRank={3}
        onSubmitRank={({ contestId, userId, rank }) => {
          console.log(contestId, userId, rank);
        }}
      />
    );
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* Root layout: full viewport, no overflow */
        .contest-root {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: #020611;
          color: white;
        }

        /* ── Sidebar ── */
        .contest-sidebar {
          width: 300px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.05);
          background: #050918;
          overflow: hidden; /* prevents sidebar itself from overflowing */
        }

        .contest-sidebar__header {
          flex-shrink: 0;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .contest-sidebar__list {
          flex: 1;           /* fills remaining sidebar height */
          overflow-y: auto;  /* scrolls when list is long */
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── Right panel ── */
        .contest-main {
          flex: 1;
          min-width: 0;        /* prevents flex overflow */
          display: flex;
          flex-direction: column;
          overflow: hidden;    /* key: clips children, enables inner scroll */
        }

        .contest-main__header {
          flex-shrink: 0;      /* never shrinks */
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(5,9,24,0.9);
          padding: 16px 24px;
          backdrop-filter: blur(12px);
        }

        .contest-main__messages {
          flex: 1;             /* fills all available space between header and footer */
          overflow-y: auto;   /* scrollable message area */
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contest-main__input {
          flex-shrink: 0;      /* never shrinks */
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(5,9,24,0.9);
          padding: 16px 24px;
          backdrop-filter: blur(12px);
        }

        /* ── Scrollbar styling ── */
        .contest-sidebar__list::-webkit-scrollbar,
        .contest-main__messages::-webkit-scrollbar {
          width: 5px;
        }
        .contest-sidebar__list::-webkit-scrollbar-track,
        .contest-main__messages::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 999px;
        }
        .contest-sidebar__list::-webkit-scrollbar-thumb,
        .contest-main__messages::-webkit-scrollbar-thumb {
          background: rgba(34,211,238,0.2);
          border-radius: 999px;
        }
        .contest-sidebar__list::-webkit-scrollbar-thumb:hover,
        .contest-main__messages::-webkit-scrollbar-thumb:hover {
          background: rgba(34,211,238,0.4);
        }
      `}</style>

      <div className="contest-root">

        {/* ═══ SIDEBAR ═══ */}
        <aside className="contest-sidebar">

          <div className="contest-sidebar__header">
            <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-extrabold text-transparent">
              Contests
            </h1>
            <p className="mt-1 text-xs text-gray-500">Active contest rooms</p>
          </div>

          <div className="contest-sidebar__list">
            {contestList?.map((contest) => (
              <div
                key={contest?.contestId}
                onClick={() => setSelectedContest(contest)}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  selectedContest?.contestId === contest?.contestId
                    ? "border-cyan-500/30 bg-cyan-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">{contest?.roomName}</h2>
                    <p className="text-xs text-gray-500">by {contest?.hostName}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${getStatusColor(contest?.status)}`}
                  >
                    {contest?.status}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-gray-500">{contest?.context}</p>
              </div>
            ))}
          </div>

        </aside>

        {/* ═══ MAIN PANEL ═══ */}
        <div className="contest-main">

          {/* HEADER */}
          <header className="contest-main__header relative">
            {selectedContest ? (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="truncate bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-2xl font-extrabold text-transparent">
                    {selectedContest?.roomName}
                  </h1>
                  <p className="mt-1 truncate text-sm text-gray-400">
                    {selectedContest?.context}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {isHost ? (
                        <button
                          onClick={() => handleStartStop(selectedContest)}
                          disabled={["completed", "ended"].includes(selectedContest?.status?.toLowerCase())}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                            (selectedContest?.status?.toLowerCase()) === "not-started"
                              ? "bg-green-600 hover:bg-green-500"
                              : ["completed", "ended"].includes(status)
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-500"
                          }`}
                        >
                          {status === "not-started"
                            ? "Start Contest"
                            : ["completed", "ended"].includes(selectedContest?.status?.toLowerCase())
                              ? "Contest Ended"
                              : "Stop Contest"}
                        </button>
                  ) 
                  : hasJoined ? (
                    <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-400">
                      ✓ Joined
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoinContest(selectedContest)}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-300 transition-colors"
                    >
                      Join Contest
                    </button>
                  )}

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusColor(selectedContest?.status)}`}
                  >
                    {selectedContest?.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a contest to get started</p>
            )}
          </header>

          {/* MESSAGES */}
          <main className="contest-main__messages">
            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Loading…
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-red-400">
                {error}
              </div>
            ) : allMessages?.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-600">
                No messages yet
              </div>
            ) : (
              allMessages.map((msg, idx) => renderMessage(msg, idx))
            )}
            <div ref={scrollRef} />
          </main>

          {/* INPUT */}
          <footer className="contest-main__input">
            {!selectedContest ? (
              <p className="text-sm text-gray-500">Select a contest</p>
            ) : isHost ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-400 text-sm">
                👑 You're the host — submission disabled
              </div>
            ) : !hasJoined ? (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <p className="text-sm text-gray-500">Join contest first</p>
                <button
                  onClick={() => handleJoinContest(selectedContest)}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-300 transition-colors"
                >
                  Join Now
                </button>
              </div>
            ) : selectedContest?.status?.toLowerCase() === "not-started" ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-yellow-300 text-sm">
                Waiting for host to start the contest…
              </div>
            ) : selectedContest?.status?.toLowerCase() === "completed" ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-gray-500 text-sm">
                Contest has ended
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  type="text"
                  placeholder="Enter your prompt…"
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-gray-600 focus:border-cyan-500/40 transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!prompt.trim()}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-bold text-black disabled:opacity-40 transition-opacity"
                >
                  Send
                </button>
              </div>
            )}
          </footer>

        </div>
      </div>
    </>
  );
}

export default ContestRoom;