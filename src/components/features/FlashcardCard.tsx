"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface FlashcardCardProps {
  question: string;
  answer: string;
  securityAngle: string | null;
  isFlipped: boolean;
  nodeTitle: string;
  nodeColor: string;
  onFlip: () => void;
}

function renderWithCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="font-mono px-1 rounded text-sm"
          style={{ background: "#1E2235" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function FlashcardCard({
  question,
  answer,
  securityAngle,
  isFlipped,
  nodeTitle,
  nodeColor,
  onFlip,
}: FlashcardCardProps) {
  return (
    <div
      onClick={onFlip}
      className="bg-surface border border-border rounded-2xl min-h-[320px] relative cursor-pointer mx-auto max-w-2xl w-full"
    >
      {/* Theme badge — always visible */}
      <div
        className="absolute top-4 left-4 z-10 text-xs font-mono uppercase px-2 py-1 rounded"
        style={{ backgroundColor: `${nodeColor}33`, color: nodeColor }}
      >
        {nodeTitle}
      </div>

      {/* RÉPONSE badge — only when flipped */}
      {isFlipped && (
        <div className="absolute top-4 right-4 z-10 text-xs text-muted uppercase tracking-wider">
          RÉPONSE
        </div>
      )}

      {/* Flip container */}
      <div
        style={{ perspective: "1000px" }}
        className="relative w-full min-h-[320px]"
      >
        {/* Front face */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center p-8 pt-14"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-xl font-medium text-center leading-relaxed">
            {renderWithCode(question)}
          </p>
        </motion.div>

        {/* Back face */}
        <motion.div
          className="absolute inset-0 p-4 md:p-8 pt-12 md:pt-14 flex flex-col items-center justify-start overflow-y-auto"
          animate={{ rotateY: isFlipped ? 0 : -180 }}
          initial={{ rotateY: -180 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-base md:text-lg text-center leading-relaxed break-words w-full whitespace-normal">
            {renderWithCode(answer)}
          </p>

          {securityAngle && (
            <div
              className="mt-6 w-full border-l-4 border-danger rounded-r-lg p-3 md:p-4 text-left"
              style={{ background: "#EF444415" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle
                  size={16}
                  className="text-danger flex-shrink-0"
                />
                <span className="text-sm font-semibold text-danger">
                  Angle sécurité
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted break-words">
                {securityAngle}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
