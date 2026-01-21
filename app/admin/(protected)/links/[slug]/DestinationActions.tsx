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
  url,
}: {
  slug: string;
  destinationId: string;
  url: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [draftUrl, setDraftUrl] = useState(url);

  function openDialog() {
    setDraftUrl(url);
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
            if (!confirm("确定删除这个目标 URL 吗？")) e.preventDefault();
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
            编辑目标 URL
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
            <span className={tableStyles.labelText}>目标 URL</span>
            <input
              className={tableStyles.input}
              name="url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              required
              autoFocus
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
