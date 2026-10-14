import { useEffect, useRef } from 'react';

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SignaturePad({ label, value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const image = new Image();
    image.onload = () => canvas.getContext('2d')?.drawImage(image, 0, 0);
    image.src = value;
  }, [value]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    const context = canvas.getContext('2d')!;
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawingRef.current = true;
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = getPoint(event);
    const context = canvasRef.current!.getContext('2d')!;
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <button type="button" onClick={clear} className="text-xs text-slate-500 hover:text-slate-900">Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={stop}
        onPointerCancel={stop}
        className="w-full h-24 border border-slate-300 rounded-lg bg-white touch-none cursor-crosshair"
      />
    </div>
  );
}
