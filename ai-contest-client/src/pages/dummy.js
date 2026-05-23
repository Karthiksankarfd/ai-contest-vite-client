import { useContext, useState, useEffect } from "react";
import { ContestListContext } from "../context/ContestList";
import { SocketContext } from "../context/SocketContext";
import { RoomChatContext } from "../context/RoomChatContext";
import { AuthContext } from "../context/AuthContext";
import { SOCKET_EVENTS } from "../services/socket/socketevents/socketEvents";
import { useRef } from "react";

function ContestRoom() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [joinedContests, setJoinedContests] = useState(new Set());
    const [joiningId, setJoiningId] = useState(null);
    const scrollRef = useRef(null);
    const { user } = useContext(AuthContext);
    const { messagesByRoom, setMessagesByRoom } = useContext(RoomChatContext);
    const { contestList, setContestList } = useContext(ContestListContext);
    const [chat, setChat] = useState([])
    const [selectedContest, setSelectedContest] = useState(contestList?.[0] || null);
    const { socket } = useContext(SocketContext);
    const [conversations, setConversations] = useState(
        messagesByRoom[selectedContest?.contestId] || [],
    );
    const [prompt, setPrompt] = useState("");

    const isHost = selectedContest?.hostId === user?.id;
    const hasJoined =
        selectedContest?.participants?.includes(user?.id) ||
        joinedContests.has(selectedContest?.contestId);

    async function fetchContests() {
        try {
            const response = await fetch("http://localhost:5000/api/contests", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (response.ok) {
                setContestList(() => data.contests);
            } else {
                console.error("Failed to fetch contests:", data);
            }
        } catch (err) {
            console.error("Error fetching contests:", err);
        }
    }

    async function handleJoinContest(contest) {
        if (!contest || joiningId === contest.contestId) return;
        setJoiningId(contest.contestId);
        socket.emit(SOCKET_EVENTS.EMIT.JOIN_ROOM, {
            ...contest,
            participantId: user?.id,
        });
        setJoinedContests((prev) => new Set([...prev, contest.contestId]));
        setSelectedContest((prev) => {
            if (!prev || prev.contestId !== contest.contestId) return prev;
            const existing = prev.participants ?? [];
            if (existing.includes(user.id)) return prev;
            return { ...prev, participants: [...existing, user.id] };
        });
        setContestList((prev) =>
            prev.map((c) => {
                if (c.contestId !== contest.contestId) return c;
                const existing = c.participants ?? [];
                if (existing.includes(user.id)) return c;
                return { ...c, participants: [...existing, user.id] };
            }),
        );
        setChat(() => [...submissions, ...messagesByRoom[contest.contestId]])
        setJoiningId(null);
    }

    function handleStartStop(contest) {
        if (!contest) return;
        if (contest?.status === "not-started") {
            socket.emit(SOCKET_EVENTS.EMIT.START_CONTEST, {
                contestId: contest.contestId,
            });
        } else {
            socket.emit(SOCKET_EVENTS.EMIT.STOP_CONTEST, {
                contestId: contest.contestId,
            });
        }
    }

    async function handleSendMessage() {
        if (!prompt.trim() || !selectedContest) return;
        const messageData = {
            contestId: selectedContest.contestId,
            prompt,
            user,
            time: new Date().toLocaleTimeString(),
        };
        socket.emit(SOCKET_EVENTS.EMIT.SUBMIT_PROMPT, messageData);
        setPrompt("");
    }
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [submissions, messagesByRoom, selectedContest?.contestId]);

    function getStatusColor(status) {
        switch (status) {
            case "live":
                return "border-green-500/30 bg-green-500/10 text-green-400";
            case "completed":
                return "border-red-500/30 bg-red-500/10 text-red-400";
            default:
                return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
        }
    }

    useEffect(() => {

        fetchContests();

        socket.on(SOCKET_EVENTS.LISTEN.USER_JOINED, (data) => {
            console.log("Joined Room Event:", data);
            setMessagesByRoom((prev) => {
                const roomMessages = prev[data?.contestId] || [];
                return {
                    ...prev,
                    [data?.contestId]: [...roomMessages, {
                        ...data,
                        status: `User With Id ${data?.participantId} has Joined`,
                        sentBy: "server",
                    },
                    ],
                };
            });
        });


        function handleRoomMessage(data) {
            setMessagesByRoom((prev) => {
                const roomMessages = prev[data?.contestId] || [];
                return { ...prev, [data?.contestId]: [...roomMessages, data] };
            });
        }

        socket.on(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED, (data) => {
            setContestList((prev) =>( [...prev, data.payload]));
        });

        socket.on(SOCKET_EVENTS.LISTEN.CONTEST_STARTED, (data) => {
            setContestList((prev) => prev.map((contest) => contest.contestId === data.contestId ? { ...contest, status: "Live" } : contest));
            if(selectedContest?.constestId === data?.constestId){
                selectedContest((prev)=> ({ ...prev , status: "Live" }) )
            }
        });

        socket.on(SOCKET_EVENTS.LISTEN.IMAGE_GENERATED, (data) => {
            console.log("Image generated:", data);
        });

        socket.on(SOCKET_EVENTS.LISTEN.JOB_UPDATE, (data) => {
          console.log("job status received -", data?.status);

          const serverMessage = {
            contestId: data?.contestId,
            sentBy: "server",
            output: data?.output || null,
            status: data?.status,
            event: data?.status,
            userId: data?.user?.userId,
            email: data?.user?.email,
            time: new Date().toLocaleTimeString(),
          };

          setMessagesByRoom((prev) => {
            const roomMessages = prev?.[data?.contestId] || [];
            return {
              ...prev,
              [data?.contestId]: [
                ...roomMessages,
                serverMessage,
              ],
            };
          });
        });

        socket.on(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleRoomMessage);

        // socket.on(SOCKET_EVENTS.LISTEN.CONTEST_UPDATE, (data) => { });

        socket.on(SOCKET_EVENTS.LISTEN.ERROR, (data) => {
            console.log("Socket error:", data);
        });

        return () => {
            socket.off(SOCKET_EVENTS.LISTEN.CONTEST_STARTED);
            socket.off(SOCKET_EVENTS.LISTEN.JOINED_TO_ROOM);
            socket.off(SOCKET_EVENTS.LISTEN.NEW_MESSAGES, handleRoomMessage);
            socket.off(SOCKET_EVENTS.LISTEN.CONTEST_ROOM_CREATED);
            socket.off(SOCKET_EVENTS.LISTEN.CONTEST_UPDATE);
            socket.off(SOCKET_EVENTS.LISTEN.IMAGE_GENERATED);
            socket.off(SOCKET_EVENTS.LISTEN.JOB_UPDATE);
            socket.off(SOCKET_EVENTS.LISTEN.ERROR);
        };
    }, []);

    useEffect(() => {
        if (!selectedContest?.contestId) return;
        async function fetchSubmissions() {
            try {
                setLoading(true);
                setError("");
                const response = await fetch(
                    `http://localhost:5000/api/contest-submissions/${selectedContest.contestId}`,
                );
                const data = await response.json();
                if (!data.success) throw new Error(data.message);
                setSubmissions(data.submissions);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch submissions.");
            } finally {
                setLoading(false);
            }
        }
        fetchSubmissions();
    }, [selectedContest?.contestId]);

    return (
        <>
            {/* Global scrollbar styles injected once */}
            <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 999px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.25); border-radius: 999px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.45); }
      `}</style>

            <div className="flex h-screen overflow-hidden bg-[#020611] text-white">
                {/* ── LEFT SIDEBAR ── */}
                <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-white/5 bg-[#050918]">
                    {/* Sidebar header */}
                    <div className="flex-shrink-0 border-b border-white/5 px-5 py-4">
                        <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-extrabold text-transparent">
                            Contests
                        </h1>
                        <p className="mt-0.5 text-xs text-gray-500">Active contest rooms</p>
                    </div>

                    {/* Scrollable list */}
                    <div className="custom-scroll flex-1 overflow-y-auto p-3 space-y-2">
                        {contestList.length === 0 ? (
                            <p className="pt-8 text-center text-sm text-gray-600">
                                No contests available. Create one to get started!
                            </p>
                        ) : (
                            contestList.map((contest) => (
                                <div
                                    key={contest?.contestId}
                                    onClick={() => {
                                        setSelectedContest(contest);
                                        setConversations(messagesByRoom[contest?.contestId] || []);
                                    }}
                                    className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${selectedContest?.contestId === contest?.contestId
                                        ? "border-cyan-500/30 bg-cyan-500/10"
                                        : "border-white/[0.06] bg-white/[0.02] hover:border-cyan-500/20 hover:bg-white/[0.04]"
                                        }`}
                                >
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-bold text-white">
                                                {contest?.roomName}
                                            </h2>
                                            <p className="mt-0.5 text-xs text-gray-600">
                                                by {contest?.hostName}
                                            </p>
                                        </div>
                                        <span
                                            className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusColor(contest?.status)}`}
                                        >
                                            {contest?.status}
                                        </span>
                                    </div>
                                    <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
                                        {contest?.context}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                    {/* Contest Details Header */}
                    <div className="flex-shrink-0 border-b border-white/5 bg-[#050918]/90 px-6 py-4 backdrop-blur-xl">
                        {selectedContest ? (
                            <>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <h1 className="truncate bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-2xl font-extrabold text-transparent">
                                            {selectedContest.roomName}
                                        </h1>
                                        <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                                            {selectedContest.context}
                                        </p>
                                    </div>

                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        {isHost ? (
                                            <button
                                                onClick={() => handleStartStop(selectedContest)}
                                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${selectedContest?.status === "not-started"
                                                    ? "bg-green-600 hover:bg-green-500"
                                                    : "bg-red-600 hover:bg-red-500"
                                                    }`}
                                            >
                                                {selectedContest?.status === "not-started"
                                                    ? "Start Contest"
                                                    : "Stop Contest"}
                                            </button>
                                        ) : hasJoined ? (
                                            <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-400">
                                                ✓ Joined
                                            </span>
                                        ) : (
                                            <button
                                                disabled={joiningId === selectedContest?.contestId}
                                                onClick={() => handleJoinContest(selectedContest)}
                                                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {joiningId === selectedContest?.contestId
                                                    ? "Joining…"
                                                    : "Join Contest"}
                                            </button>
                                        )}

                                        <span
                                            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${getStatusColor(selectedContest?.status)}`}
                                        >
                                            {selectedContest?.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Info Cards */}
                                <div className="mt-4 grid grid-cols-4 gap-3">
                                    {[
                                        {
                                            label: "Host",
                                            value: selectedContest?.hostName,
                                            color: "text-cyan-400",
                                        },
                                        {
                                            label: "Contest ID",
                                            value: selectedContest?.contestId,
                                            color: "text-white",
                                            truncate: true,
                                        },
                                        {
                                            label: "Created",
                                            value: new Date(
                                                selectedContest?.createdAt,
                                            ).toLocaleDateString(),
                                            color: "text-white",
                                        },
                                        {
                                            label: "Participants",
                                            value: selectedContest?.participants?.length ?? 0,
                                            color: "text-purple-400",
                                        },
                                    ].map(({ label, value, color, truncate }) => (
                                        <div
                                            key={label}
                                            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                                        >
                                            <p className="text-[10px] uppercase tracking-wider text-gray-600">
                                                {label}
                                            </p>
                                            <p
                                                className={`mt-1.5 text-sm font-semibold ${color} ${truncate ? "truncate" : ""}`}
                                            >
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <h1 className="text-xl font-bold text-gray-400">
                                Select a contest to get started
                            </h1>
                        )}
                    </div>

                    {/* ── Submissions / Chat Area ── */}
                    <div
                        className="custom-scroll flex-1 overflow-y-auto px-6 py-5"
                        id={`${selectedContest?.contestId}-chat-container`}
                    >
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
                                    <p className="text-sm text-gray-500">Loading submissions…</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        ) : (submissions.length === 0 && messagesByRoom[selectedContest?.constestId] === 0) ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-2xl">
                                        💬
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        No submissions yet. Start the conversation!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">

                                {
                                
                                 [ ...submissions , ...messagesByRoom[selectedContest?.constestId] || [] ].map((msg) => {
                                    // console.log(submissions[submissions.length - 1]  )
                                    console.log(msg)
                                    // if (msg?.event === "User-Joined") {
                                    //     return (<div>{msg?.status}</div>)
                                    // } else if (msg?.event === "Prompt-Queued") {
                                    //     return (<div>{msg?.status}</div>)
                                    // } else if (msg?.event === "Image-Generated") {
                                    //     return (<div>{msg?.status}</div>)
                                    // }else if(msg?.event === "Contest-Started"){
                                    //     return (<div>{msg?.status}</div>)
                                    // }else if(msg?.event === "Queuse-Processing-Prompt"){
                                    //     return (<div>{msg?.status}</div>)
                                    // }else{
                                    //     return (
                                    //         <div>
                                    //             <img
                                    //                 src={msg?.output}
                                    //                 alt="output"
                                    //                 className="mt-3 w-full h-64 object-cover rounded-xl border border-white/10"
                                    //             />
                                    //             <p>{msg?.prompt}</p>
                                    //         </div>
                                    //     )
                                    // }
                                })}
                            </div>
                        )}
                        <div ref={scrollRef}></div>
                    </div>

                    {/* ── Input Bar ── */}
                    <div className="flex-shrink-0 border-t border-white/5 bg-[#050918]/90 px-6 py-4 backdrop-blur-xl">
                        {!selectedContest ? (
                            <p className="text-sm text-gray-600">
                                Select a contest to participate.
                            </p>
                        ) : isHost ? (
                            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                                <span className="text-lg">👑</span>
                                <p className="text-sm font-semibold text-amber-400">
                                    You're the host — submission is disabled.
                                </p>
                            </div>
                        ) : !hasJoined ? (
                            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                <p className="text-sm text-gray-500">
                                    Join the contest first to submit your prompt.
                                </p>
                                <button
                                    disabled={joiningId === selectedContest?.contestId}
                                    onClick={() => handleJoinContest(selectedContest)}
                                    className="ml-4 flex-shrink-0 rounded-lg bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-black hover:bg-cyan-300 disabled:opacity-60 transition-colors"
                                >
                                    {joiningId === selectedContest?.contestId
                                        ? "Joining…"
                                        : "Join Now"}
                                </button>
                            </div>
                        ) : selectedContest?.status === "not-started" ? (
                            <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-yellow-400 animate-pulse" />
                                <p className="text-sm text-yellow-300">
                                    Waiting for the host to start the contest…
                                </p>
                            </div>
                        ) : selectedContest?.status === "completed" ? (
                            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gray-500" />
                                <p className="text-sm text-gray-500">This contest has ended.</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <input
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    type="text"
                                    placeholder="Enter your prompt…"
                                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-cyan-500/20"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!prompt.trim()}
                                    className="flex-shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-bold text-black transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
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
