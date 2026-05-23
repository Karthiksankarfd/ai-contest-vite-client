function ChatPromptCard({
  email,
  prompt,
  time,
  isCurrentUser = false,
}) {
  return (
    <div
      className={`flex ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-lg rounded-3xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 ${
          isCurrentUser
            ? "border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10"
            : "border-white/10 bg-white/[0.05]"
        }`}
      >
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isCurrentUser ? "bg-cyan-400" : "bg-purple-400"
            }`}
          />

          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {isCurrentUser ? "You" : email}
          </p>
        </div>

        {/* Prompt */}
        <p className="text-sm leading-relaxed text-gray-200">
          {prompt}
        </p>

        {/* Footer */}
        {time && (
          <div className="mt-4 flex justify-end">
            <span className="text-xs text-gray-500">
              {time}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPromptCard;