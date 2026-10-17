import { cn } from "@/lib/utils";

/**
 * Right-hand panel of the auth split-screen. Pure CSS/SVG — no JS shipped.
 * Concept: the logo's pixel squares drift down from the top-right and
 * "resolve into" a pulsing voice waveform at the center.
 */

// Echoes the logo mark: a loose trail of squares from top-right toward center.
const PIXELS: Array<{
  size: number;
  top: number; // %
  left: number; // %
  duration: number; // s
  delay: number; // s
  opacity: number;
}> = [
  { size: 22, top: 8, left: 84, duration: 11, delay: 0, opacity: 0.22 },
  { size: 12, top: 14, left: 92, duration: 9, delay: 1.2, opacity: 0.18 },
  { size: 16, top: 20, left: 76, duration: 10, delay: 2.4, opacity: 0.2 },
  { size: 9, top: 27, left: 88, duration: 8, delay: 0.6, opacity: 0.16 },
  { size: 18, top: 33, left: 68, duration: 12, delay: 3.1, opacity: 0.2 },
  { size: 10, top: 40, left: 79, duration: 9, delay: 1.8, opacity: 0.15 },
  { size: 14, top: 47, left: 60, duration: 10, delay: 0.9, opacity: 0.18 },
  { size: 8, top: 52, left: 70, duration: 8, delay: 2.7, opacity: 0.14 },
  { size: 20, top: 12, left: 12, duration: 12, delay: 1.5, opacity: 0.14 },
  { size: 11, top: 26, left: 22, duration: 9, delay: 3.6, opacity: 0.12 },
  { size: 15, top: 64, left: 16, duration: 11, delay: 0.3, opacity: 0.16 },
  { size: 9, top: 74, left: 28, duration: 8, delay: 2.1, opacity: 0.12 },
  { size: 13, top: 82, left: 64, duration: 10, delay: 1.1, opacity: 0.15 },
  { size: 10, top: 70, left: 86, duration: 9, delay: 3.9, opacity: 0.14 },
];

// A looping snippet of what the product does: a caller and the AI agent.
const CONVERSATION = [
  { from: "caller", text: "Hi, are you open tomorrow?" },
  { from: "agent", text: "We are, from 9am. Would you like to book a time?" },
  { from: "caller", text: "Yes, 10:30 please." },
  { from: "agent", text: "Done! You're booked for 10:30. See you then." },
] as const;

// Symmetric-ish waveform silhouette (bar heights in px).
const WAVE_BARS = [
  10, 16, 24, 34, 46, 32, 20, 28, 42, 54, 38, 26, 18, 26, 38, 54, 42, 28, 20, 32, 46, 34, 24, 16, 10,
];

export function BrandPanel() {
  return (
    <div className="absolute inset-0 flex flex-col justify-end overflow-hidden bg-linear-135 from-brand-blue to-brand-teal p-12">
      {/* drifting logo pixels */}
      <div aria-hidden className="absolute inset-0">
        {PIXELS.map((pixel, i) => (
          <span
            key={i}
            className="pixel-drift absolute rounded-[2px] bg-white"
            style={
              {
                width: pixel.size,
                height: pixel.size,
                top: `${pixel.top}%`,
                left: `${pixel.left}%`,
                opacity: pixel.opacity,
                "--pixel-opacity": pixel.opacity,
                "--pixel-duration": `${pixel.duration}s`,
                "--pixel-delay": `${pixel.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* the voice: pulsing waveform */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">
        <div className="flex -translate-y-12 items-center gap-1.5">
          {WAVE_BARS.map((height, i) => (
            <span
              key={i}
              className="wave-pulse w-[3px] rounded-full bg-white/75"
              style={
                {
                  height,
                  "--wave-delay": `${i * 0.07}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* the call: caller speaks above the waveform, the agent replies below */}
      <div aria-hidden className="absolute inset-0 flex items-center">
        <div className="grid w-full -translate-y-32 justify-items-start px-10">
          {CONVERSATION.filter((m) => m.from === "caller").map((message, i) => (
            <div
              key={i}
              className={cn(
                `call-bubble-${i * 2 + 1}`,
                "max-w-[280px] rounded-2xl rounded-bl-sm bg-white/15 px-3.5 py-2 text-sm text-white shadow-sm backdrop-blur-sm [grid-area:1/1]"
              )}
            >
              {message.text}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="absolute inset-0 flex items-center">
        <div className="grid w-full translate-y-8 justify-items-end px-10">
          {CONVERSATION.filter((m) => m.from === "agent").map((message, i) => (
            <div
              key={i}
              className={cn(
                `call-bubble-${i * 2 + 2}`,
                "max-w-[280px] rounded-2xl rounded-br-sm bg-white px-3.5 py-2 text-sm text-neutral-900 shadow-sm [grid-area:1/1]"
              )}
            >
              {message.text}
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col gap-3 text-white">
        <h2 className="font-heading text-3xl font-semibold">Every call answered.</h2>
        <p className="max-w-md text-base/relaxed text-white/85">
          AI voice agents that pick up the phone, answer queries and capture
          leads for your business — around the clock.
        </p>
      </div>
    </div>
  );
}
