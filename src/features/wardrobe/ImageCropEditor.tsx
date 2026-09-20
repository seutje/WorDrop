import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import {
  framedImageGeometry,
  type ImageFraming,
} from "../../lib/images/imageFraming";

export function ImageCropEditor({
  source,
  framing,
  onChange,
}: {
  source: string;
  framing: ImageFraming;
  onChange: (framing: ImageFraming) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const initialFraming = useRef(framing);
  const dragRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [frameWidth, setFrameWidth] = useState(288);
  const frameHeight = frameWidth * 1.25;
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setFrameWidth(frame.clientWidth || 288);
    update();
    if (!("ResizeObserver" in globalThis)) return;
    const observer = new globalThis.ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const geometry = framedImageGeometry(
    dimensions.width,
    dimensions.height,
    frameWidth,
    frameHeight,
    framing,
  );

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      startX: framing.x,
      startY: framing.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start) return;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    onChange({
      ...framing,
      x: clamp(start.startX + (2 * (event.clientX - start.x)) / frameWidth),
      y: clamp(start.startY + (2 * (event.clientY - start.y)) / frameHeight),
    });
  }

  return (
    <div className="crop-editor">
      <div
        ref={frameRef}
        className="crop-frame"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={() => (dragRef.current = null)}
      >
        <img
          src={source}
          alt="Clothing crop preview"
          draggable={false}
          onLoad={(event) =>
            setDimensions({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
          style={{
            width: geometry.width,
            height: geometry.height,
            left: geometry.left,
            top: geometry.top,
          }}
        />
      </div>
      <label className="crop-zoom">
        <span>Zoom</span>
        <input
          type="range"
          min="1"
          max="4"
          step="0.01"
          value={framing.zoom}
          onChange={(event) =>
            onChange({ ...framing, zoom: Number(event.target.value) })
          }
        />
      </label>
      <div className="crop-actions">
        <button type="button" onClick={() => onChange({ zoom: 1, x: 0, y: 0 })}>
          Fit whole image
        </button>
        <button type="button" onClick={() => onChange(initialFraming.current)}>
          Reset
        </button>
      </div>
      <p className="field-help">
        Drag to reposition. The framed preview is used throughout the app.
      </p>
    </div>
  );
}
