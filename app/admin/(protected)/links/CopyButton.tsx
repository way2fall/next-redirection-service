"use client";

import { useEffect, useState } from "react";
import styles from "./links.module.css";

export default function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1200);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${state === "copied" ? styles.copyBtnOk : ""} ${
        state === "error" ? styles.copyBtnErr : ""
      }`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("error");
        }
      }}
    >
      {state === "copied" ? "已复制" : state === "error" ? "复制失败" : "复制"}
    </button>
  );
}
