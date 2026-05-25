import SubmissionCard from "./OutputCard";
import ChatPromptCard from "./ChatPromptCard";
import { UserX, UserIcon, ArrowUpIcon } from "lucide-react";
export default function renderMessage( msg, idx , selectedContest, user) {

    const isSystemMessage = ["rank-update", "prompt-queued", "contest-started", "queue-processing-prompt", "contest-ended" , "score-update"].includes(msg?.event );

    // ───────────────── RANK UPDATE CARD
    if (msg?.event === "rank-update") {
      return (
        <div
          key={String(idx).concat(Date.now())}
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
    if (msg?.event === "prompt-queued") {
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
    if (msg?.event === "contest-ended") {
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
                        #{winner?.participantRank || index + 1}
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

    if(msg?.event === "user-eliminated"){
      return (
        <div key={idx} className="flex justify-center py-2">
            <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 space-y-4">

                {/* Section label */}
                <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-xs font-medium uppercase tracking-widest text-red-500">Elimination</p>
                </div>

                {/* Status / event badge */}
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3.5 py-2">
                <UserX className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {msg?.status || msg?.event}
                </p>
                </div>

                {/* User row */}
                <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{msg?.email}</p>
                    <p className="text-xs text-muted-foreground">
                    Final score: <span className="font-medium text-foreground">{msg?.score}</span>
                    </p>
                </div>
                </div>

                {/* Prompt */}
                <div className="border-t border-border pt-3 space-y-1">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Prompt</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{msg?.prompt}</p>
                </div>

            </div>
        </div>
      ); 
    }
    if(msg?.event === "user-joined" || msg?.status === "user-joined"){
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

    if(msg?.event === "score-update"){
        return (
            <div key={idx} className="flex justify-center py-2">
            <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5">

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Score updated</p>
                    <p className="text-sm font-medium text-foreground truncate">{msg?.email}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg px-2.5 py-1">
                    <ArrowUpIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">{msg?.score}</span>
                </div>
                </div>

                {/* Prompt */}
                <div className="border-t border-border pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{msg?.prompt}</p>
                </div>

            </div>
            </div>
     )
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
<>

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
</>
    );
  }