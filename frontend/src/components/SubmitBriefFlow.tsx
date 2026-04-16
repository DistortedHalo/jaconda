import { ArrowLeft, Calendar, LoaderCircle, X } from "lucide-react";
import { useMemo, useState } from "react";
import { genreOptions, moodOptions } from "../data";
import type { SubmitFlowState } from "../types";
import { MultiSelect } from "./MultiSelect";

type SubmitBriefFlowProps = {
  open: boolean;
  onClose: () => void;
};

const initialState: SubmitFlowState = {
  brand: "",
  agency: "",
  campaignTitle: "",
  creativeBrief: "",
  genres: [],
  moods: [],
  duration: "",
  natureOfUse: "",
  media: "",
  territory: "",
  licenseAgreementTerm: "",
  commencementDate: "",
  campaignBudget: "",
  mediaSpendBudget: "",
};

export function SubmitBriefFlow({ open, onClose }: SubmitBriefFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<SubmitFlowState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canContinueStepOne = useMemo(() => {
    return Boolean(form.campaignTitle && form.creativeBrief && form.genres.length && form.moods.length);
  }, [form]);

  const canContinueStepTwo = useMemo(() => {
    return Boolean(
      form.duration &&
      form.natureOfUse &&
      form.media &&
      form.territory &&
      form.licenseAgreementTerm &&
      form.commencementDate &&
      form.campaignBudget &&
      form.mediaSpendBudget
    );
  }, [form]);

  const update = <K extends keyof SubmitFlowState>(key: K, value: SubmitFlowState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const closeAndReset = () => {
    setStep(1);
    setForm(initialState);
    setSubmitting(false);
    setSubmitError(null);
    onClose();
  };

  const submitBrief = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to send brief" }));
        throw new Error(data.error || "Failed to send brief");
      }

      setStep(4);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to send brief");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <div className="absolute inset-0 modal-scrollbar">
        {step === 1 && (
          <div className="container-shell min-h-screen py-6 md:py-8">
            <div className="flex justify-end">
              <button type="button" onClick={closeAndReset} className="text-white/35 transition hover:text-white">
                <X size={26} />
              </button>
            </div>

            <div className="mx-auto mt-2 max-w-[760px] pb-20">
              <h1 className="huge-title">Submit<br />brief</h1>
              <p className="mt-4 text-white/34">We'll curate a shortlist within 24–48 hours.</p>

              <div className="mt-16 space-y-12">
                <div className="space-y-2"><label className="field-label">Brand</label><input className="line-input" value={form.brand} onChange={(e) => update("brand", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Agency</label><input className="line-input" value={form.agency} onChange={(e) => update("agency", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Campaign title</label><input className="line-input" value={form.campaignTitle} onChange={(e) => update("campaignTitle", e.target.value)} /></div>
                <div className="space-y-2">
                  <label className="field-label">Creative brief</label>
                  <p className="field-help">Brief overview of the project/campaign. Please include storyboard links, WIP clips if possible.</p>
                  <textarea className="mt-2 min-h-[170px] w-full border border-white/12 bg-transparent p-4 text-lg text-white outline-none placeholder:text-white/18" value={form.creativeBrief} onChange={(e) => update("creativeBrief", e.target.value)} />
                </div>
                <MultiSelect label="Genres *" options={genreOptions} values={form.genres} onChange={(values) => update("genres", values)} placeholder="Select genres..." />
                <MultiSelect label="Moods *" options={moodOptions} values={form.moods} onChange={(values) => update("moods", values)} placeholder="Select moods..." />
                <div className="border-t border-white/12 pt-12">
                  <button type="button" onClick={() => setStep(2)} disabled={!canContinueStepOne} className="primary-outline-button w-full disabled:cursor-not-allowed disabled:opacity-30">Continue</button>
                  <button type="button" onClick={closeAndReset} className="mx-auto mt-8 block text-white/36 transition hover:text-white">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="container-shell min-h-screen py-6 md:py-8">
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-white/35 transition hover:text-white"><ArrowLeft size={16} /> Back</button>
              <button type="button" onClick={closeAndReset} className="text-white/35 transition hover:text-white"><X size={26} /></button>
            </div>

            <div className="mx-auto mt-6 max-w-[760px] pb-20">
              <h1 className="huge-title">Usage &<br />scope</h1>
              <p className="mt-4 text-white/34">Provide details on how the track will be used.</p>

              <div className="mt-16 space-y-12">
                <div className="space-y-2"><label className="field-label">Duration</label><input className="line-input" placeholder="e.g. 30 seconds, full track" value={form.duration} onChange={(e) => update("duration", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Nature of use</label><textarea className="mt-2 min-h-[140px] w-full border border-white/12 bg-transparent p-4 text-lg text-white outline-none placeholder:text-white/18" value={form.natureOfUse} onChange={(e) => update("natureOfUse", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Media</label><input className="line-input" placeholder="e.g. Instagram, TikTok, YouTube" value={form.media} onChange={(e) => update("media", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Territory</label><input className="line-input" placeholder="e.g. Worldwide" value={form.territory} onChange={(e) => update("territory", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">License agreement term</label><input className="line-input" placeholder="e.g. 1 year" value={form.licenseAgreementTerm} onChange={(e) => update("licenseAgreementTerm", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Commencement date</label><div className="relative"><input type="date" className="line-input pr-12" value={form.commencementDate} onChange={(e) => update("commencementDate", e.target.value)} /><Calendar className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/35" size={18} /></div></div>
                <div className="space-y-2"><label className="field-label">Campaign budget</label><input className="line-input" placeholder="e.g. £10,000" value={form.campaignBudget} onChange={(e) => update("campaignBudget", e.target.value)} /></div>
                <div className="space-y-2"><label className="field-label">Media spend budget</label><input className="line-input" placeholder="e.g. £50,000" value={form.mediaSpendBudget} onChange={(e) => update("mediaSpendBudget", e.target.value)} /></div>
                <div className="border-t border-white/12 pt-12">
                  <button type="button" onClick={() => setStep(3)} disabled={!canContinueStepTwo} className="primary-outline-button w-full disabled:cursor-not-allowed disabled:opacity-30">Continue</button>
                  <button type="button" onClick={() => setStep(1)} className="mx-auto mt-8 block text-white/36 transition hover:text-white">← Back</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="container-shell min-h-screen py-10">
            <div className="mx-auto max-w-[760px] pb-24">
              <h1 className="huge-title">Review<br />brief</h1>
              <p className="mt-4 text-white/34">Final check before sending.</p>
              {submitError ? <p className="mt-6 border border-red-400/20 bg-red-500/10 px-4 py-3 text-red-200">{submitError}</p> : null}
              <div className="mt-16 border-t border-white/10">
                {[["Brand", form.brand || "—"],["Agency", form.agency || "—"],["Campaign title", form.campaignTitle],["Genres", form.genres.join(", ")],["Moods", form.moods.join(", ")],["Duration", form.duration],["Media", form.media],["Territory", form.territory],["License term", form.licenseAgreementTerm],["Commencement date", form.commencementDate],["Campaign budget", form.campaignBudget],["Media spend budget", form.mediaSpendBudget]].map(([label, value]) => (
                  <div key={label} className="grid gap-4 border-b border-white/10 py-6 md:grid-cols-[220px_1fr]">
                    <div className="field-label">{label}</div>
                    <div className="text-lg text-white/82">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-12 flex flex-col gap-4 md:flex-row">
                <button type="button" onClick={submitBrief} disabled={submitting} className="primary-outline-button flex-1 disabled:cursor-not-allowed disabled:opacity-30">
                  {submitting ? <><LoaderCircle size={18} className="mr-2 animate-spin" /> Sending brief</> : "Send brief"}
                </button>
                <button type="button" onClick={() => setStep(2)} className="small-outline-button justify-center">← Back</button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="container-shell flex min-h-screen items-center justify-center py-10">
            <div className="w-full max-w-[900px] text-center">
              <h1 className="massive-title">Brief<br />received.</h1>
              <p className="mt-12 text-[2rem] text-white/88">We'll come back with a shortlist.</p>
              <p className="mt-4 text-white/24">Typical turnaround: same day / next day depending on scope.</p>
              <div className="mt-16 flex flex-col justify-center gap-4 md:flex-row">
                <a href="#" className="small-outline-button justify-center border-white/24 px-8 py-4 text-[1.12rem]">→ Book a call</a>
                <a href="mailto:hello@dubsync.com" className="small-outline-button justify-center border-white/24 px-8 py-4 text-[1.12rem]">→ Send a message</a>
              </div>
              <button type="button" onClick={closeAndReset} className="mt-14 text-[1.25rem] text-white/34 transition hover:text-white">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
