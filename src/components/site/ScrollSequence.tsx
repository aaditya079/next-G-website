import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [stageText, setStageText] = useState("Initializing...");
  const [frameText, setFrameText] = useState("Frame: 1 / 300");

  const totalFrames = 300;
  const coreStep = 5;
  const imagesRef = useRef<HTMLImageElement[]>(new Array(totalFrames));
  const loadedImagesRef = useRef<Set<number>>(new Set());
  const sequenceRef = useRef({ frame: 0 });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Normalize touch events for mobile momentum scroll
    ScrollTrigger.normalizeScroll(true);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const drawImageProp = (img: HTMLImageElement) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const iw = img.width;
      const ih = img.height;
      const r = Math.min(w / iw, h / ih);
      
      const nw = iw * r;
      const nh = ih * r;
      const cx = (w - nw) / 2;
      const cy = (h - nh) / 2;

      ctx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);
    };

    const findClosestLoadedIndex = (targetIndex: number) => {
      const loaded = loadedImagesRef.current;
      if (loaded.has(targetIndex)) return targetIndex;
      
      let closest = 0;
      let minDiff = Infinity;
      for (const idx of loaded) {
        const diff = Math.abs(idx - targetIndex);
        if (diff < minDiff) {
          minDiff = diff;
          closest = idx;
        }
      }
      return closest;
    };

    const updateMilestones = (frameIndex: number) => {
      const current = Math.round(frameIndex);
      setFrameText(`Frame: ${current + 1} / ${totalFrames}`);

      if (current < 30) {
        setStageText("Foundation & Excavation Planning");
      } else if (current < 90) {
        setStageText("Column Erection & Steel Framework");
      } else if (current < 170) {
        setStageText("Beam Reinforcement & Deck Slab");
      } else if (current < 250) {
        setStageText("Concrete Pouring & Curing Stage");
      } else {
        setStageText("Final Structural Inspection");
      }
    };

    const drawFrame = (frameIndex: number) => {
      const rounded = Math.round(frameIndex);
      const actualIndex = findClosestLoadedIndex(rounded);
      const img = imagesRef.current[actualIndex];
      
      if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        drawImageProp(img);
        updateMilestones(frameIndex);
      }
    };

    const resizeCanvas = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      drawFrame(sequenceRef.current.frame);
    };

    window.addEventListener("resize", resizeCanvas);

    // Initial render setup
    const firstImg = new Image();
    firstImg.src = "/frames/ezgif-frame-001.jpg";
    firstImg.onload = () => {
      imagesRef.current[0] = firstImg;
      loadedImagesRef.current.add(0);
      resizeCanvas();
      
      // Start queue
      startQueue();
    };

    let scrollTriggerInstance: ScrollTrigger | null = null;

    const initScrollTrigger = () => {
      scrollTriggerInstance = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        pin: pinRef.current,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const frameIndex = self.progress * (totalFrames - 1);
          sequenceRef.current.frame = frameIndex;
          drawFrame(frameIndex);
        }
      });
    };

    const startQueue = () => {
      const loadQueue: number[] = [];
      for (let i = 0; i < totalFrames; i += coreStep) {
        if (i !== 0) loadQueue.push(i);
      }
      for (let i = 0; i < totalFrames; i += 2) {
        if (i % coreStep !== 0 && i !== 0) loadQueue.push(i);
      }
      for (let i = 1; i < totalFrames; i += 2) {
        if (i % 2 !== 0 && i % coreStep !== 0) loadQueue.push(i);
      }

      const totalCoreCount = Math.floor(totalFrames / coreStep);
      let coreLoaded = 0;
      let queueIdx = 0;
      const maxWorkers = 5;

      const worker = () => {
        if (queueIdx >= loadQueue.length) return;
        const idx = loadQueue[queueIdx++];
        const img = new Image();
        img.src = `/frames/ezgif-frame-${String(idx + 1).padStart(3, "0")}.jpg`;
        
        img.onload = () => {
          imagesRef.current[idx] = img;
          loadedImagesRef.current.add(idx);

          if (idx % coreStep === 0) {
            coreLoaded++;
            const percent = Math.min(Math.round((coreLoaded / totalCoreCount) * 100), 100);
            setProgress(percent);
            
            if (percent === 100) {
              setIsReady(true);
              setTimeout(() => {
                initScrollTrigger();
              }, 100);
            }
          }

          if (Math.round(sequenceRef.current.frame) === idx) {
            drawFrame(idx);
          }
          worker();
        };

        img.onerror = () => {
          worker();
        };
      };

      for (let w = 0; w < maxWorkers; w++) {
        worker();
      }
    };

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[300vh] bg-navy-light overflow-visible">
      <div ref={pinRef} className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-navy">
        <div className="pointer-events-none absolute inset-0 bp-grid-dark opacity-30" />
        
        {/* Title overlay */}
        <div className="absolute top-10 right-10 z-10 text-right pointer-events-none font-mono text-[10px] text-offwhite/50 tracking-wider">
          NG // 3D.SIMULATION.v2
        </div>

        {/* Milestone Indicator */}
        <div className="absolute top-10 left-10 z-10 pointer-events-none bg-graphite/80 border border-white/10 p-4 rounded backdrop-blur">
          <div className="text-[9px] font-mono text-amber uppercase tracking-wider mb-1">◤ Simulation Stage</div>
          <div className="text-sm font-semibold text-white">{stageText}</div>
          <div className="text-[10px] font-mono text-orange mt-1">{frameText}</div>
        </div>

        {/* Scroll Instruction */}
        <div className="absolute bottom-10 z-10 pointer-events-none bg-graphite/60 border border-white/10 px-4 py-2 rounded-full backdrop-blur">
          <div className="text-[10px] font-mono text-orange tracking-widest uppercase animate-pulse">
            ↓ Scroll to scrub construction timeline
          </div>
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} className="w-full h-full max-w-full max-h-full object-contain block will-change-transform" />

        {/* Local Loading Screen Overlay */}
        {!isReady && (
          <div className="absolute inset-0 bg-navy z-20 flex flex-col items-center justify-center p-6 transition-opacity duration-500">
            <div className="bg-graphite/40 border border-white/10 p-8 rounded-lg max-w-md w-full text-center backdrop-blur-md">
              <div className="inline-flex items-center gap-1.5 text-orange font-mono text-[10px] font-bold tracking-widest uppercase border border-orange/30 px-3 py-1 rounded mb-4">
                ◤ Next G Engineers
              </div>
              <h4 className="text-xl font-bold text-white mb-2">3D Construction Sequence</h4>
              <p className="text-xs text-muted-foreground mb-6">Preloading structural keyframes...</p>
              
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative mb-3">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-orange transition-all duration-300 shadow-[0_0_8px_rgba(232,98,44,0.5)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <div className="text-xs font-mono text-orange font-bold flex justify-between">
                <span>PROGRESS</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
