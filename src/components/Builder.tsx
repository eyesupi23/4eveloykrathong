import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BaseId, FlowerId, KrathongConfig } from '../types';
import { BASE_IDS, BASES, FLOWER_IDS, FLOWERS, NAME_MAX, WISH_MAX } from '../lib/data';
import { decorationIcon } from '../lib/decorations';
import { pixelateImage } from '../lib/pixelate';
import { KrathongSprite } from './KrathongSprite';

interface Props {
  onClose: () => void;
  onFloat: (cfg: KrathongConfig) => void;
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <span className="font-pixel text-[10px] text-gold">{n}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Builder({ onClose, onFloat }: Props) {
  const [base, setBase] = useState<BaseId>('banana');
  const [flower, setFlower] = useState<FlowerId>('sun');
  const [image, setImage] = useState<string | null>(null);
  const [wish, setWish] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview: KrathongConfig = { base, flower, image, wish, name };

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setImage(await pixelateImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อ่านรูปนี้ไม่ได้ ลองรูปอื่น');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!wish.trim()) return;
    onFloat({ base, flower, image, wish: wish.trim(), name: name.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#05061a]/75 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-title"
        className="px-window max-h-[92dvh] w-full max-w-3xl overflow-y-auto outline-none"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gold px-4 py-2 text-[#1a1440]">
          <h2 id="builder-title" className="text-lg font-bold">
            สร้างกระทงของคุณ
          </h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="px-2 font-pixel text-xs hover:text-[#c2410c]">
            X
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_1.15fr] sm:gap-8 sm:p-6">
          {/* Preview */}
          <div className="sm:sticky sm:top-14 sm:self-start">
            <div className="relative grid place-items-center overflow-hidden bg-[#0e2661] pb-3 pt-8">
              <span className="absolute inset-x-0 bottom-0 h-[38%] bg-[#0a1a47]" />
              <span className="ripple absolute bottom-[30%] left-[18%] right-[18%] h-[3px]" />
              <div className="relative">
                <span className="glow absolute left-[63%] top-[30%] aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2" />
                <KrathongSprite config={preview} width="min(240px, 60vw)" />
              </div>
            </div>
            <div className="px-bubble relative mx-auto mt-6 w-fit max-w-full px-3 py-2 text-center">
              <p className="text-sm font-semibold">{wish.trim() || 'คำอธิษฐานจะขึ้นตรงนี้'}</p>
              {name.trim() && <p className="text-xs text-[#4b5294]">จาก {name.trim()}</p>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-6">
            <Step n={1} title="เลือกชนิดของกระทง">
              <div className="grid grid-cols-3 gap-3">
                {BASE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={base === id}
                    onClick={() => {
                      setBase(id);
                    }}
                    className="px-option flex flex-col items-center gap-1 px-1 py-2 text-sm"
                  >
                    <KrathongSprite config={{ ...preview, base: id, image: null }} width={64} />
                    {BASES[id].name}
                  </button>
                ))}
              </div>
            </Step>

            <Step n={2} title="เลือกของตกแต่ง">
              <div className="grid grid-cols-4 gap-3">
                {FLOWER_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={flower === id}
                    onClick={() => {
                      setFlower(id);
                    }}
                    className="px-option flex flex-col items-center gap-1.5 px-1 py-2.5 text-xs sm:text-sm"
                  >
                    <img src={decorationIcon(id)} alt="" aria-hidden className="pixelated h-9 w-9" />
                    {FLOWERS[id].name}
                  </button>
                ))}
              </div>
            </Step>

            <Step n={3} title="เลือกรูปปักกระทง">
              <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()} className="px-chip px-4 py-2 text-sm font-semibold" disabled={busy}>
                  {busy ? 'กำลังเตรียมรูป…' : image ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                </button>
                {image && (
                  <>
                    <img src={image} alt="รูปที่ปักบนกระทง" className="h-12 w-12 object-cover" />
                    <button type="button" onClick={() => setImage(null)} className="text-sm text-mute underline-offset-4 hover:text-ink hover:underline">
                      เอารูปออก
                    </button>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-mute">รูปจะถูกย่อเป็นภาพพิกเซล 16×16 แล้วปักบนไม้เหนือกระทง</p>
              {error && <p className="mt-2 text-sm text-rose">{error}</p>}
            </Step>

            <Step n={4} title="คำอธิษฐาน">
              <label className="sr-only" htmlFor="wish">เขียนคำอธิษฐาน</label>
              <div className="relative">
                <input
                  id="wish"
                  value={wish}
                  maxLength={WISH_MAX}
                  onChange={(e) => setWish(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="เขียนคำอธิษฐาน..."
                  className="px-field w-full px-3 py-2.5 pr-14 text-base placeholder:text-[#6b72a8]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-mute">
                  {wish.length}/{WISH_MAX}
                </span>
              </div>
              <label className="sr-only" htmlFor="name">ชื่อ</label>
              <input
                id="name"
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อของคุณ (ไม่ใส่ก็ได้)"
                className="px-field mt-4 w-full px-3 py-2 text-sm placeholder:text-[#6b72a8]"
              />
            </Step>

            <button type="button" onClick={submit} disabled={!wish.trim()} className="px-btn mt-1 w-full py-3.5 text-lg">
              ลอยกระทง
            </button>
            {/* <p className="-mt-3 text-center text-xs text-mute">.✦ ݁˖ ลอยออนไลน์จะได้ไม่มีขยะลงแม่น้ำจริง .✦ ݁˖</p> */}
          </div>
        </div>
      </div>
    </div>
  );
}
