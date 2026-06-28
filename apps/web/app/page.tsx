"use client";

import { useEffect, useState } from "react";

const FROM = "coming";
const TO = "hacking";

const frames = [
  ...Array.from({ length: FROM.length }, (_, i) =>
    FROM.slice(0, FROM.length - 1 - i),
  ),
  ...Array.from({ length: TO.length }, (_, i) => TO.slice(0, i + 1)),
];

export default function Page() {
  const [text, setText] = useState(FROM);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    const advance = () => {
      setText(frames[i]);
      if (++i < frames.length) timer = setTimeout(advance, 100);
    };
    timer = setTimeout(advance, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="container">
      <h1 className="title">openhacker</h1>
      <p className="subtitle">
        &gt; <span className="typed">{text}</span> soon
      </p>
    </main>
  );
}
