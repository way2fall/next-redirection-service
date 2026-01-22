"use client";

import { useId, useRef, useState } from "react";
import tableStyles from "../links.module.css";
import styles from "./slug.module.css";
import {
  deleteDestination,
  editDestination,
  resetDestinationClickCount,
} from "./serverActions";

export default function DestinationActions({
  slug,
  destinationId,
  name,
  urls,
}: {
  slug: string;
  destinationId: string;
  name: string;
  urls: string[];
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [draftName, setDraftName] = useState(name);
  const [draftUrlsText, setDraftUrlsText] = useState(urls.join("\n"));

  function openDialog() {
    setDraftName(name);
    setDraftUrlsText(urls.join("\n"));
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <div className={tableStyles.actionRow}>
        <button
          className={tableStyles.actionBtn}
          type="button"
          onClick={openDialog}
        >
          编辑
        </button>
        <form action={resetDestinationClickCount}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="destinationId" value={destinationId} />
          <button
            className={`${tableStyles.actionBtn} ${tableStyles.reset}`}
            type="submit"
          >
            重置
          </button>
        </form>
        <form
          action={deleteDestination}
          onSubmit={(e) => {
            if (!confirm("确定删除这个目标组吗？")) e.preventDefault();
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="destinationId" value={destinationId} />
          <button
            className={`${tableStyles.actionBtn} ${tableStyles.delete}`}
            type="submit"
          >
            删除
          </button>
        </form>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
      >
        <header className={styles.dialogHeader}>
          <div className={styles.dialogTitle} id={titleId}>
            编辑目标组
          </div>
          <button
            className={styles.dialogClose}
            type="button"
            onClick={closeDialog}
            aria-label="关闭"
          >
            ×
          </button>
        </header>

        <form action={editDestination} className={styles.dialogBody}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="destinationId" value={destinationId} />
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>链接名称</span>
            <input
              className={tableStyles.input}
              name="name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>目标 URL（每行一个）</span>
            <textarea
              className={tableStyles.input}
              name="url"
              value={draftUrlsText}
              onChange={(e) => setDraftUrlsText(e.target.value)}
              required
              rows={6}
            />
          </label>

          <div className={styles.dialogActions}>
            <button
              className={tableStyles.actionBtn}
              type="button"
              onClick={closeDialog}
            >
              取消
            </button>
            <button className={tableStyles.actionBtn} type="submit">
              保存
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
