import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  onClose: () => void;
}

function Item({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="font-pixel shrink-0 text-[10px] text-gold">{n}</span>
      <p className="text-sm leading-relaxed sm:text-base">{children}</p>
    </li>
  );
}

/** Welcome / FYI shown before entering the river. */
export function IntroModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-70 grid place-items-center bg-[#05061a]/80 p-3 sm:p-6">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        className="px-window max-h-[92dvh] w-full max-w-lg overflow-y-auto outline-none"
      >
        <div className="sticky top-0 z-10 bg-gold px-4 py-2 text-[#1a1440]">
          <h2 id="intro-title" className="text-lg font-bold">
            ยินดีต้อนรับสู่ ลอยกระทง Fevetiwowww!!!
          </h2>
        </div>

        <div className="p-5 sm:p-6">
          <ol className="flex flex-col gap-4">
            <Item n={1}>
              สร้างกระทงของคุณได้ที่เมนู{" "}
              <span className="font-semibold text-gold">สร้างกระทง</span>{" "}
              เมื่อเสร็จแล้วกด{" "}
              <span className="font-semibold text-gold">ลอยกระทง</span>{" "}
              ลงสู่แม่น้ำออนไลน์ได้แบบไม่จำกัดจำนวน
            </Item>
            <Item n={2}>
              สามารถเล่นมินิเกมในงานได้ที่{" "}
              <span className="font-semibold text-gold">โซนเกม</span>
            </Item>
            <Item n={3}>
              กดปุ่มลำโพงมุมขวาบนเพื่อเปิดเสียงคอนเสิร์ตที่กำลังแสดงอยู่{" "}
              เพื่อเพิ่มอรรถรสในการลอยกระทงยิ่งขึ้น (˶˃𐃷˂˶)
            </Item>
            <Item n={4}>
              กดปุ่มกล้องถ่ายรูปมุมขวาบนเพื่อซ่อนปุ่มเมนูบนหน้าจอ
              เพื่อให้สามารถแคปหน้าจอไปแชร์ลงโซเชียลสวยๆ ได้
            </Item>
            <Item n={5}>
              เกมนี้จัดทำขึ้นเพื่อความบันเทิงเท่านั้น
              ศิลปินและค่ายไม่มีส่วนเกี่ยวข้องใดๆ ทั้งสิ้น
            </Item>
            <Item n={6}>
              
              การลอยกระทงเป็นแบบออนไลน์ ทุกคนมีโอกาสเห็นกระทงของกันและกันได้
              และคุณยังสามารถแตะที่กระทงเพื่อดูคำอธิษฐานของคุณและคนอื่นๆ ได้ด้วย
              <br />
              แต่ถ้ากระทงเยอะ ก็จะแออัดนิดนึงนะคะ ◝(ᵔᗜᵔ)◜
            </Item>
            <Item n={7}>หวังว่าทุกคนจะสนุกน้า enjoy คับบ!</Item>
          </ol>

          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-btn px-7 py-3 text-lg"
            >
              <span className="blink font-pixel text-xs">▶</span>{" "}
              เข้าสู่งานลอยกระทง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
