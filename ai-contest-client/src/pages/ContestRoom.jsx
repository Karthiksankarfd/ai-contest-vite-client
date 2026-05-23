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

  const { contestList, setContestList } =
    useContext(ContestListContext);

  const { messagesByRoom, setMessagesByRoom } =
    useContext(RoomChatContext);

  const [selectedContest, setSelectedContest] = useState(
    contestList?.[0] || null,
  );

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
      (p) =>
        Number(p?.participantId || p) === Number(user?.id),
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
        contest.contestId === contestId
          ? updater(contest)
          : contest,
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
      const response = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/api/contests`,
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        return;
      }

      const serialized = (data?.contests || []).map(
        (contest) => ({
          ...contest,
          participants: contest?.participants || [],
        }),
      );

      setContestList(serialized);

      if (!selectedContest && serialized?.length > 0) {
        setSelectedContest(serialized[0]);
      }
    } catch (err) {
      console.error("FETCH CONTEST ERROR => ", err);
    }
  }

  // ─────────────────────────────────────────────
  // JOIN CONTEST
  // ─────────────────────────────────────────────

  async function handleJoinContest(contest) {
    if (!contest) return;

    if (joiningId === contest?.contestId) return;

    setJoiningId(contest.contestId);

    socket.emit(SOCKET_EVENTS.EMIT.JOIN_ROOM, {
      ...contest,
      participantId: user?.id,
    });

    updateContest(contest.contestId, (prev) => {
      const participants = prev?.participants || [];

      const alreadyJoined = participants.some(
        (p) =>
          Number(p?.participantId || p) === Number(user?.id),
      );

      if (alreadyJoined) return prev;

      return {
        ...prev,
        participants: [
          ...participants,
          {
            participantId: user?.id,
          },
        ],
      };
    });

    setJoiningId(null);
  }

  // ─────────────────────────────────────────────
  // START / STOP CONTEST
  // ─────────────────────────────────────────────

  function handleStartStop(contest) {
    console.log("contest updaet -" , contest)
    if (!contest) return;

    const normalized = contest?.status?.toLowerCase();

    if (normalized === "not-started") {
      socket.emit(SOCKET_EVENTS.EMIT.START_CONTEST, {contestId: contest.contestId});
    } else {
      console.log("end contest" , contest)
      socket.emit(SOCKET_EVENTS.EMIT.END_CONTEST, {
        contestId: contest.contestId,
      });
    }
  }

  // ─────────────────────────────────────────────
  // SEND PROMPT
  // ─────────────────────────────────────────────

  function handleSendMessage() {
    if (!prompt.trim()) return;

    if (!selectedContest) return;

    const payload = {
      contestId: selectedContest?.contestId,
      prompt,
      user,
      participantId: user?.id,
      time: new Date().toLocaleTimeString(),
    };

    socket.emit(
      SOCKET_EVENTS.EMIT.SUBMIT_PROMPT,
      payload,
    );

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

        if (!data?.success) {
          throw new Error(data?.message);
        }

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
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [allMessages]);

  // ─────────────────────────────────────────────
  // SOCKET EVENTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    fetchContests();

    // USER JOINED
    const handleUserJoined = (data) => {
      updateContest(data?.contestId, (prev) => {
        const participants = prev?.participants || [];

        const exists = participants.some(
          (p) =>
            Number(p?.participantId || p) ===
            Number(data?.participantId),
        );

        if (exists) return prev;

        return {
          ...prev,
          participants: [
            ...participants,
            {
              participantId: data?.participantId,
            },
          ],
        };
      });

      addMessageToRoom(data?.contestId, {
        ...data,
        sentBy: "server",
        event: "User-Joined",
        status: `User ${data?.participantId} joined the contest`,
      });
    };

    // NEW MESSAGE
    const handleNewMessage = (data) => {
      addMessageToRoom(data?.contestId, data);
    };

    // JOB UPDATE
    const handleJobUpdate = (data) => {

      console.log("update recldskcdsc" , data)
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

    // CONTEST CREATED
    const handleContestCreated = (data) => {
      setContestList((prev) => [...prev, data?.payload]);
    };

    // CONTEST STARTED
    const handleContestStarted = (data) => {
      updateContest(data?.contestId, (prev) => ({
        ...prev,
        status: "live",
      }));

      addMessageToRoom(data?.contestId, {
        ...data,
        event: "Contest-Started",
        status: "Contest Started",
      });
    };

    // CONTEST ENDED
    const handleContestEnded = (data) => {
      updateContest(data?.contestId, (prev) => ({
        ...prev,
        status: "completed",
      }));

      addMessageToRoom(data?.contestId, {
        ...data,
        event: "Contest-Ended",
      });
    };

    // RANK UPDATE
    const handleRankUpdate = (data) => {
      addMessageToRoom(data?.contestId, data);
    };

    // JOB FAILED
    const handleJobFailed = (data) => {
      addMessageToRoom(data?.contestId, data);
    };

    socket.on(
      SOCKET_EVENTS.LISTEN.USER_JOINED,
      handleUserJoined,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.NEW_MESSAGES,
      handleNewMessage,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.JOB_UPDATE,
      handleJobUpdate,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED,
      handleContestCreated,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.CONTEST_STARTED,
      handleContestStarted,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.CONTEST_ENDED,
      handleContestEnded,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.RANK_UPDATE,
      handleRankUpdate,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.JOB_FAILED,
      handleJobFailed,
    );

    socket.on(
      SOCKET_EVENTS.LISTEN.ERROR,
      console.log,
    );

    return () => {
      socket.off(
        SOCKET_EVENTS.LISTEN.USER_JOINED,
        handleUserJoined,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.NEW_MESSAGES,
        handleNewMessage,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.JOB_UPDATE,
        handleJobUpdate,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED,
        handleContestCreated,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.CONTEST_STARTED,
        handleContestStarted,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.CONTEST_ENDED,
        handleContestEnded,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.RANK_UPDATE,
        handleRankUpdate,
      );

      socket.off(
        SOCKET_EVENTS.LISTEN.JOB_FAILED,
        handleJobFailed,
      );

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
              <h2 className="text-sm font-bold tracking-wide text-green-400">
                Rank Updated
              </h2>

              <p className="text-xs text-gray-400">
                Participant ranking updated
              </p>
            </div>
          </div>

          <div className="my-4 h-px bg-white/10" />

          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-500">
                Participant
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {msg?.email}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-500">
                Assigned Rank
              </p>

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
            isCurrentUser={
              user?.email === msg?.user?.email
            }
          />
        </div>
      );
    }

if (msg?.event === "Contest-Ended") {
  return (
    <div key={idx} className="flex justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#0b1020] via-[#111827] to-[#1e1b4b] p-6 shadow-2xl backdrop-blur-xl">
        
        {/* Header */}
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

        {/* Divider */}
        <div className="my-6 h-px bg-white/10" />

        {/* Winners */}
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
                {/* Left */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/20 text-2xl">
                    {medals[index] || "🏅"}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400">
                      Participant
                    </p>

                    <h2 className="text-lg font-bold text-white">
                      User #{winner?.participantId}
                    </h2>
                  </div>
                </div>

                {/* Right */}
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Rank
                  </p>

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

    // ───────────────── GENERATED IMAGE
    if (isImageGenerated) {
      return (
        <SubmissionCard
          key={idx}
          message={msg}
          currentUserEmail={user?.email}
          maxRank={3}
          onSubmitRank={({ contestId, userId, rank }) => {
            console.log(contestId, userId, rank);
          }}
        />
      );
    }

    // ───────────────── NORMAL CARD
    return (
      <SubmissionCard
        key={idx}
        message={msg}
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
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 999px;
        }

        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(34,211,238,0.25);
          border-radius: 999px;
        }

        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(34,211,238,0.45);
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#020611] text-white">
        {/* SIDEBAR */}

        <div className="w-[320px] flex-shrink-0 border-r border-white/5 bg-[#050918]">
          <div className="border-b border-white/5 px-5 py-4">
            <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-extrabold text-transparent">
              Contests
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Active contest rooms
            </p>
          </div>

          <div className="custom-scroll space-y-2 overflow-y-auto p-3">
            {contestList?.map((contest) => (
              <div
                key={contest?.contestId}
                onClick={() =>
                  setSelectedContest(contest)
                }
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  selectedContest?.contestId ===
                  contest?.contestId
                    ? "border-cyan-500/30 bg-cyan-500/10"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">
                      {contest?.roomName}
                    </h2>

                    <p className="text-xs text-gray-500">
                      by {contest?.hostName}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${getStatusColor(
                      contest?.status,
                    )}`}
                  >
                    {contest?.status}
                  </span>
                </div>

                <p className="line-clamp-2 text-xs text-gray-500">
                  {contest?.context}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* HEADER */}

          <div className="border-b border-white/5 bg-[#050918]/90 px-6 py-4 backdrop-blur-xl">
            {selectedContest ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-2xl font-extrabold text-transparent">
                      {selectedContest?.roomName}
                    </h1>

                    <p className="mt-1 text-sm text-gray-400">
                      {selectedContest?.context}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isHost ? (
                      <button
                        onClick={() =>
                          handleStartStop(selectedContest)
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                          selectedContest?.status?.toLowerCase() ===
                          "not-started"
                            ? "bg-green-600 hover:bg-green-500"
                            : "bg-red-600 hover:bg-red-500"
                        }`}
                      >
                        {selectedContest?.status?.toLowerCase() ===
                        "not-started"
                          ? "Start Contest"
                          : "Stop Contest"}
                      </button>
                    ) : hasJoined ? (
                      <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-400">
                        ✓ Joined
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          handleJoinContest(
                            selectedContest,
                          )
                        }
                        className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-300"
                      >
                        Join Contest
                      </button>
                    )}

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusColor(
                        selectedContest?.status,
                      )}`}
                    >
                      {selectedContest?.status}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <h1>Select Contest</h1>
            )}
          </div>

          {/* MESSAGES */}

          <div className="custom-scroll flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                Loading...
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-red-400">
                {error}
              </div>
            ) : allMessages?.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                No messages yet
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {allMessages.map((msg, idx) =>
                  renderMessage(msg, idx),
                )}
              </div>
            )}

            <div ref={scrollRef}></div>
          </div>

          {/* INPUT */}

          <div className="border-t border-white/5 bg-[#050918]/90 px-6 py-4">
            {!selectedContest ? (
              <p>Select contest</p>
            ) : isHost ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-400">
                👑 You're the host — submission disabled
              </div>
            ) : !hasJoined ? (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <p className="text-sm text-gray-500">
                  Join contest first
                </p>

                <button
                  onClick={() =>
                    handleJoinContest(
                      selectedContest,
                    )
                  }
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
                >
                  Join Now
                </button>
              </div>
            ) : selectedContest?.status?.toLowerCase() ===
              "not-started" ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-yellow-300">
                Waiting for host to start contest...
              </div>
            ) : selectedContest?.status?.toLowerCase() ===
              "completed" ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-gray-500">
                Contest ended
              </div>
            ) : (
              <div className="flex items-center gap-3">
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
                  placeholder="Enter prompt..."
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!prompt.trim()}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-bold text-black disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ContestRoom;