"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";

export function ManualAssetForm({ readOnly }: { readOnly: boolean }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || readOnly) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const asset: Record<string, unknown> = Object.fromEntries(data);
    for (const field of ["price", "areaSqm", "bedrooms", "bathrooms"]) {
      asset[field] = data.get(field) === "" ? null : Number(data.get(field));
    }
    key.current ??= crypto.randomUUID();
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/manual-assets", { method: "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ requestKey: key.current, asset }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "저장하지 못했습니다.");
      setMessage(`검수 대기로 저장했습니다. ${result.draft.id}`);
      key.current = null; form.reset(); router.refresh();
    } catch (e) { setError(true); setMessage(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }
  return <form className="source-config-form manual-draft-form" onSubmit={submit} onChange={() => { if (!busy) key.current = null; }}>
    <fieldset disabled={busy || readOnly}>
      <label><span>국가</span><select name="country" required defaultValue="Cambodia">
        <option value="Cambodia">캄보디아</option><option value="Vietnam">베트남</option><option value="Philippines">필리핀</option>
      </select></label>
      <label><span>도시</span><input name="city" required minLength={2} maxLength={100} /></label>
      <label><span>구역</span><input name="district" maxLength={120} /></label>
      <label><span>매물 유형</span><select name="propertyType"><option value="condo">콘도</option><option value="house">주택</option><option value="villa">빌라</option></select></label>
      <label><span>거래</span><select name="transaction"><option value="sale">매매</option><option value="rent">월 임대</option></select></label>
      <label><span>통화</span><select name="currency"><option>USD</option><option>VND</option><option>PHP</option><option>KRW</option></select></label>
      <label><span>가격 / 월 임대료</span><input name="price" type="number" min="0.01" step="0.01" required /></label>
      <label><span>면적 (㎡)</span><input name="areaSqm" type="number" min="0.01" step="0.01" required /></label>
      <label><span>침실 수</span><input name="bedrooms" type="number" min="0" max="100" step="1" /></label>
      <label><span>욕실 수</span><input name="bathrooms" type="number" min="0" max="100" step="1" /></label>
      <label className="source-field-wide"><span>매물명</span><input name="title" required minLength={3} maxLength={200} /></label>
      <label className="source-field-wide"><span>설명</span><textarea name="summary" required minLength={10} maxLength={2000} rows={4} /></label>
      <label><span>출처 링크</span><input name="sourceUrl" type="url" placeholder="https://" /></label>
      <label><span>이미지 링크</span><input name="imageUrl" type="url" placeholder="https://" /></label>
    </fieldset>
    <div className="source-config-actions source-field-wide"><button disabled={busy || readOnly} type="submit">
      {busy ? <LoaderCircle size={16} /> : <Save size={16} />} {busy ? "저장 중" : "검수 대기로 저장"}
    </button></div>
    {message && <p role={error ? "alert" : "status"} className="source-field-wide">{message}</p>}
  </form>;
}
