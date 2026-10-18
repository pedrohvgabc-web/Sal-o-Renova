import { useState } from "react";

const RESULTS = [
  { label: "Loiro iluminado", before: "/assets/resultado-001_072db1a1.jpg", after: "/assets/resultado-000_2c1f01e4.jpg" },
  { label: "Transformação e alinhamento", before: "/assets/resultado-003_7c75b231.jpg", after: "/assets/resultado-002_bbf5153b.jpg" },
  { label: "Loiro com acabamento", before: "/assets/resultado-005_92c8d6b4.jpg", after: "/assets/resultado-004_b2842d5a.jpg" },
] as const;

export default function BeforeAfterShowcase() {
  const [active, setActive] = useState(0);
  const [value, setValue] = useState(50);
  const result = RESULTS[active];
  return (
    <section className="before-after-section py-24 bg-[#20191b] overflow-hidden">
      <div className="container mx-auto">
        <div className="section-heading reveal is-visible flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <div className="max-w-xl">
            <p className="eyebrow text-[var(--rose-400)] mb-3">Resultados Renova</p>
            <h2 className="serif-title text-white text-5xl md:text-7xl">
              A arte da <span className="text-[var(--rose-300)] italic">transformação.</span>
            </h2>
          </div>
          <p className="text-zinc-400 max-w-sm text-lg leading-relaxed">
            Arraste para revelar a precisão e o cuidado em cada detalhe de nossas obras.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8 items-start">
          <div className="before-after-card p-3 rounded-[32px] bg-[#2d2327] border border-white/5 shadow-2xl">
            <div className="before-after-stage aspect-[1.45] rounded-[24px] overflow-hidden relative">
              <img src={result.before} alt={`${result.label} antes`} className="w-full h-full object-cover" />
              <div
                className="after-layer absolute inset-0 border-r-2 border-[var(--rose-300)]"
                style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
              >
                <img src={result.after} alt={`${result.label} depois`} className="w-full h-full object-cover" />
              </div>
              <span className="ba-tag absolute z-10 px-3 py-1 rounded-full uppercase tracking-wider bg-black/40 backdrop-blur-md text-[10px] left-6 top-6">Antes</span>
              <span className="ba-tag absolute z-10 px-3 py-1 rounded-full uppercase tracking-wider bg-[var(--rose-400)] text-[var(--plum)] font-bold text-[10px] right-6 top-6">Depois</span>
            </div>

            <div className="ba-control mt-8 px-4 pb-4">
              <div className="ba-control-label flex justify-between mb-4">
                <span className="text-[11px] tracking-widest text-zinc-500 uppercase">Explorar Detalhes</span>
                <strong className="text-[var(--rose-300)] font-serif text-lg">{value}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                aria-label="Controle de comparação antes e depois"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[var(--rose-300)]"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {RESULTS.map((item, index) => (
              <button
                key={item.label}
                className={`before-after-thumb flex items-center gap-4 p-3 rounded-2xl transition-all duration-500 border ${
                  active === index
                    ? "bg-[var(--renova-pink-wash)] border-[var(--rose-300)] shadow-lg"
                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                }`}
                onClick={() => { setActive(index); setValue(50); }}
              >
                <img src={item.after} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <div className="text-left">
                  <span className="text-[var(--rose-400)] text-[10px] uppercase tracking-wider font-semibold">Case Study</span>
                  <b className="block text-white text-sm font-medium leading-snug">{item.label}</b>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
