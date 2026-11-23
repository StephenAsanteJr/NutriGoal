"use client";

import { useState } from "react";

/** Mock checkout card fields. Nothing here is ever charged. */
export function CardFields({ idPrefix = "card" }: { idPrefix?: string }) {
  // Every field is controlled so values survive React's form reset after a failed (e.g. declined) attempt.
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const fmtNum = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(\d{4})(?=\d)/g, "$1 ");
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  return (
    <div className="grid grid-cols-6 gap-3">
      <div className="col-span-6">
        <label className="label" htmlFor={`${idPrefix}-name`}>
          Name on card
        </label>
        <input id={`${idPrefix}-name`} name="card_name" className="input" autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="col-span-6">
        <label className="label" htmlFor={`${idPrefix}-number`}>
          Card number
        </label>
        <input
          id={`${idPrefix}-number`}
          name="card_number"
          className="input font-mono tracking-wider"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          value={num}
          onChange={(e) => setNum(fmtNum(e.target.value))}
          required
        />
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor={`${idPrefix}-exp`}>
          Expiry
        </label>
        <input
          id={`${idPrefix}-exp`}
          name="card_exp"
          className="input font-mono"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={exp}
          onChange={(e) => setExp(fmtExp(e.target.value))}
          required
        />
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor={`${idPrefix}-cvc`}>
          CVC
        </label>
        <input id={`${idPrefix}-cvc`} name="card_cvc" className="input font-mono" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))} required />
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor={`${idPrefix}-zip`}>
          ZIP
        </label>
        <input id={`${idPrefix}-zip`} name="card_zip" className="input font-mono" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} required />
      </div>
      <p className="col-span-6 flex items-start gap-2 rounded-[2px] bg-mist px-3 py-2 text-xs text-slate">
        <span aria-hidden>🔒</span>
        <span>
          <strong>Demo checkout — no real charge.</strong> Use test card <span className="font-mono">4242 4242 4242 4242</span>, any
          future expiry, any CVC and ZIP. <span className="font-mono">4000 0000 0000 0002</span> simulates a decline.
        </span>
      </p>
    </div>
  );
}
