import { useEffect, useRef, useState } from "react";
import { checkAdminCode } from "../lib/admin";

interface Props {
  onClose: () => void;
  /** Wipes every krathong (local today, the database later). */
  onClearAll: (code: string) => Promise<void>;
}

type Step = "code" | "menu" | "done";

/** Hidden admin panel, opened by holding the "สร้างกระทง" button for 5 seconds. */
export function AdminModal({ onClose, onClearAll }: Props) {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await checkAdminCode(code);
    setBusy(false);
    if (ok) {
      setStep("menu");
      setError(null);
    } else {
      setError("รหัสไม่ถูกต้อง");
      setCode("");
      inputRef.current?.focus();
    }
  };

  const clearAll = async () => {
    if (!window.confirm("ล้างกระทงทั้งหมดในแม่น้ำ? ลบแล้วกู้คืนไม่ได้")) return;
    setBusy(true);
    try {
      await onClearAll(code);
      setStep("done");
    } catch {
      setError("ล้างไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 grid place-items-center bg-[#05061a]/80 p-3"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="admin-title" className="px-window w-full max-w-sm">
        <div className="flex items-center justify-between bg-[#e03131] px-4 py-2 text-ink">
          <h2 id="admin-title" className="font-bold">
            ผู้ดูแลระบบ
          </h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="px-2 font-pixel text-xs">
            X
          </button>
        </div>

        <div className="p-5">
          {step === "code" && (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <label htmlFor="admin-code" className="text-sm">
                ใส่รหัสผู้ดูแล
              </label>
              <input
                ref={inputRef}
                id="admin-code"
                type="password"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="px-field px-3 py-2"
              />
              {error && <p className="text-sm text-rose">{error}</p>}
              <button type="submit" disabled={busy || !code} className="px-btn mt-2 px-5 py-2.5">
                ยืนยัน
              </button>
            </form>
          )}

          {step === "menu" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-mute">ลบกระทงทุกอันออกจากแม่น้ำ รวมถึงในฐานข้อมูล</p>
              {error && <p className="text-sm text-rose">{error}</p>}
              <button
                type="button"
                onClick={clearAll}
                disabled={busy}
                className="px-btn px-btn-danger px-5 py-2.5"
              >
                {busy ? "กำลังล้าง…" : "ล้างกระทงทั้งหมด"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <p>ล้างกระทงทั้งหมดเรียบร้อยแล้ว</p>
              <button type="button" onClick={onClose} className="px-btn px-5 py-2.5">
                ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
