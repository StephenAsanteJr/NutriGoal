"use client";

import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "@/lib/domain";
import type { AvatarLook } from "./AvatarBuild";

/** Skin tone, hair style and hair colour for the animated character. Emits hidden form fields. */
export function LookPicker({
  value,
  onChange,
  extra,
}: {
  value: AvatarLook;
  onChange: (next: AvatarLook) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <input type="hidden" name="skin_tone" value={value.skinTone} />
      <input type="hidden" name="hair_style" value={value.hairStyle} />
      <input type="hidden" name="hair_color" value={value.hairColor} />

      <div>
        <span className="label">Skin tone</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Skin tone">
          {SKIN_TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={value.skinTone === t.id}
              aria-label={t.label}
              title={t.label}
              onClick={() => onChange({ ...value, skinTone: t.id })}
              className={`h-10 w-10 rounded-full border-2 transition ${value.skinTone === t.id ? "border-blue ring-2 ring-blue/30" : "border-white shadow-[0_0_0_1px_#dfe4e8] hover:scale-105"}`}
              style={{ background: `linear-gradient(135deg, ${t.hex} 55%, ${t.shade})` }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <span className="label">Hair style</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hair style">
            {HAIR_STYLES.map((h) => (
              <button
                key={h.id}
                type="button"
                role="radio"
                aria-checked={value.hairStyle === h.id}
                onClick={() => onChange({ ...value, hairStyle: h.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${value.hairStyle === h.id ? "border-blue bg-blue-tint text-blue" : "border-line text-slate hover:border-navy"}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Hair colour</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hair colour">
            {HAIR_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={value.hairColor === c.id}
                aria-label={c.label}
                title={c.label}
                onClick={() => onChange({ ...value, hairColor: c.id })}
                className={`h-8 w-8 rounded-full border-2 ${value.hairColor === c.id ? "border-blue ring-2 ring-blue/30" : "border-white shadow-[0_0_0_1px_#dfe4e8]"}`}
                style={{ background: c.id }}
              />
            ))}
          </div>
        </div>
      </div>
      {extra}
    </div>
  );
}
