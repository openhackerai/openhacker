import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        fontFamily: "monospace",
      }}
    >
      <div style={{ fontSize: 120, fontWeight: 700 }}>openhacker</div>
      <div style={{ fontSize: 48, opacity: 0.8 }}>&gt; hacking soon</div>
    </div>,
    size,
  );
}
