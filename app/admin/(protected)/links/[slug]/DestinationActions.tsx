"use client";

import { useId, useRef, useState } from "react";
import tableStyles from "../links.module.css";
import styles from "./slug.module.css";

export default function DestinationActions({
  slug,
  destinationId,
  name,
  urls,
  disabled,
  onReset,
  onDelete,
  onEdit,
}: {
  slug: string;
  destinationId: string;
  name: string;
  urls: string[];
  disabled: boolean;
  onReset: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: (next: { name: string; urls: string[] }) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [draftName, setDraftName] = useState(name);
  const [draftUrlsText, setDraftUrlsText] = useState(urls.join("\n"));
  const [saving, setSaving] = useState(false);

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
          disabled={disabled}
        >
          编辑
        </button>
        <button
          className={`${tableStyles.actionBtn} ${tableStyles.reset}`}
          type="button"
          disabled={disabled}
          onClick={() => onReset()}
        >
          重置
        </button>
        <button
          className={`${tableStyles.actionBtn} ${tableStyles.delete}`}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!confirm("确定删除这个目标组吗？")) return;
            void onDelete();
          }}
        >
          删除
        </button>
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

        <form
          className={styles.dialogBody}
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving || disabled) return;
            const urls = draftUrlsText
              .split(/\r?\n/g)
              .map((s) => s.trim())
              .filter(Boolean);

            setSaving(true);
            try {
              await onEdit({ name: draftName, urls });
              closeDialog();
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className={tableStyles.label}>
            <span className={tableStyles.labelText}>链接名称</span>
            <input
              className={tableStyles.input}
              name="name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
              autoFocus
              disabled={disabled || saving}
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
              disabled={disabled || saving}
            />
          </label>

          <div className={styles.dialogActions}>
            <button
              className={tableStyles.actionBtn}
              type="button"
              onClick={closeDialog}
              disabled={saving}
            >
              取消
            </button>
            <button className={tableStyles.actionBtn} type="submit" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
