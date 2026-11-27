"use client";

import { FACIAL_HAIR, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "@/lib/domain";
import type { AvatarLook } from "./AvatarBuild";

/** Skin tone, hair and (for men) facial hair for the animated character. Emits hidden form fields. */
export function LookPicker({
  value,
  onChange,
  extra,
  sex,
}: {
  value: AvatarLook;
  onChange: (next: AvatarLook) => void;
  extra?: React.ReactNode;
  sex?: string;
}) {
  return (
    <div className="space-y-5">
      <input type="hidden" name="skin_tone" value={value.skinTone} />
      <input type="hidden" name="hair_style" value={value.hairStyle} />
      <input type="hidden" name="hair_color" value={value.hairColor} />
      <input type="hidden" name="facial_hair" value={sex === "male" ? value.facialHair ?? "none" : "none"} />

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
              className={`h-10 w-10 rounded-full border-2 transition ${value.skinTone === t.id ? "border-bcg-deep ring-2 ring-bcg/30" : "border-white shadow-[0_0_0_1px_#dfe6e1] hover:scale-105"}`}
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
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${value.hairStyle === h.id ? "border-bcg-deep bg-bcg-tint text-bcg-deep" : "border-line text-slate hover:border-ink"}`}
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
                className={`h-8 w-8 rounded-full border-2 ${value.hairColor === c.id ? "border-bcg-deep ring-2 ring-bcg/30" : "border-white shadow-[0_0_0_1px_#dfe6e1]"}`}
                style={{ background: c.id }}
              />
            ))}
          </div>
        </div>
      </div>
      {sex === "male" && (
        <div>
          <span className="label">Facial hair</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Facial hair">
            {FACIAL_HAIR.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={(value.facialHair ?? "none") === f.id}
                onClick={() => onChange({ ...value, facialHair: f.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${(value.facialHair ?? "none") === f.id ? "border-bcg-deep bg-bcg-tint text-bcg-deep" : "border-line text-slate hover:border-ink"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {extra}
    </div>
  );
}
