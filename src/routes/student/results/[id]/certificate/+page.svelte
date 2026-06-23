<script lang="ts">
  import type { PageData } from './$types';
  import { ChevronLeft, Download, Shield, Award } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const c = data.certificate;

  let downloading = $state(false);

  async function downloadPDF() {
    downloading = true;
    try {
      const { default: jsPDF }      = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const el = document.getElementById('certificate-print')!;
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`certificate-${c.courseCode}-${c.matricNumber}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      downloading = false;
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }
</script>

<svelte:head><title>Certificate — {c.courseCode}</title></svelte:head>

<div class="cert-page">
  <div class="cert-toolbar">
    <a href="/student/results/{c.resultId}" class="back-link">
      <ChevronLeft size={14}/> Back to Result
    </a>
    <button class="btn-download" onclick={downloadPDF} disabled={downloading}>
      <Download size={15}/>
      {downloading ? 'Generating PDF…' : 'Download PDF'}
    </button>
  </div>

  <!-- Certificate -->
  <div id="certificate-print" class="certificate">
    <!-- Watermark -->
    <div class="watermark">MOUAU eTEST</div>

    <!-- Border decoration -->
    <div class="cert-border">
      <!-- Header -->
      <div class="cert-header">
        <div class="cert-logo">
          <Shield size={48} color="#10b981"/>
        </div>
        <div class="cert-institution">
          <h1>Michael Okpara University of Agriculture, Umudike</h1>
          <p class="cert-system">MOUAU eTest — Computer-Based Testing Platform</p>
        </div>
      </div>

      <div class="cert-divider"></div>

      <!-- Title -->
      <div class="cert-title-block">
        <div class="cert-ribbon"><Award size={18} color="white"/> Certificate of Achievement</div>
      </div>

      <!-- Body -->
      <div class="cert-body">
        <p class="cert-presents">This is to certify that</p>
        <h2 class="cert-name">{c.studentName}</h2>
        <p class="cert-matric">Matriculation Number: <strong>{c.matricNumber}</strong></p>
        <p class="cert-dept">{c.department}{c.level ? ` · ${c.level}` : ''}</p>

        <p class="cert-achievement">
          has successfully completed the computer-based examination for
        </p>

        <div class="cert-course-block">
          <span class="cert-course-code">{c.courseCode}</span>
          <span class="cert-course-title">{c.courseTitle}</span>
        </div>

        <div class="cert-scores">
          <div class="score-box">
            <span class="score-label">Score</span>
            <span class="score-value">{c.score ?? '—'}%</span>
          </div>
          <div class="score-box grade-box">
            <span class="score-label">Grade</span>
            <span class="score-value grade-val">{c.grade ?? '—'}</span>
          </div>
          <div class="score-box">
            <span class="score-label">Session</span>
            <span class="score-value sm">{c.session}</span>
          </div>
          <div class="score-box">
            <span class="score-label">Semester</span>
            <span class="score-value">{c.semester}</span>
          </div>
        </div>

        <p class="cert-date">Issued on {formatDate(c.submittedAt)}</p>
      </div>

      <div class="cert-divider"></div>

      <!-- Footer -->
      <div class="cert-footer">
        <div class="cert-sig">
          <div class="sig-line"></div>
          <p class="sig-name">MOUAU eTest</p>
          <p class="sig-title">Computer-Based Testing Platform</p>
        </div>

        <!-- QR Code (rendered via img from public API) -->
        <div class="cert-qr">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data={encodeURIComponent(c.verifyUrl)}"
            alt="Verification QR Code"
            width="90" height="90"
          />
          <p class="qr-label">Scan to verify</p>
        </div>

        <div class="cert-verify">
          <p class="verify-url">{c.verifyUrl}</p>
          <p class="verify-id">ID: {c.resultId}</p>
        </div>
      </div>

      <!-- Disclaimer -->
      <div class="cert-disclaimer">
        <Shield size={12}/>
        This certificate is issued by the MOUAU eTest platform and is <strong>not an official document endorsed by Michael Okpara University of Agriculture, Umudike</strong>. It serves as a record of computer-based test performance only.
      </div>
    </div>
  </div>
</div>

<style>
  .cert-page { max-width: 960px; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

  .cert-toolbar { display: flex; justify-content: space-between; align-items: center; }
  .back-link { display: inline-flex; align-items: center; gap: .3rem; font-size: .8rem; font-weight: 600; color: #10b981; text-decoration: none; }
  .btn-download { display: inline-flex; align-items: center; gap: .4rem; padding: .65rem 1.25rem; background: #10b981; color: white; border: none; border-radius: .625rem; font-weight: 700; font-size: .875rem; cursor: pointer; transition: filter .2s; }
  .btn-download:hover:not(:disabled) { filter: brightness(.9); }
  .btn-download:disabled { opacity: .6; cursor: not-allowed; }

  /* ── Certificate ── */
  .certificate { position: relative; background: #ffffff; border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.12); }

  .watermark {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 6rem; font-weight: 900; color: rgba(16,185,129,.04); transform: rotate(-30deg);
    pointer-events: none; user-select: none; letter-spacing: .1em; z-index: 0;
  }

  .cert-border {
    position: relative; z-index: 1;
    margin: 1.5rem; padding: 2rem;
    border: 3px solid #10b981;
    border-radius: .75rem;
    display: flex; flex-direction: column; gap: 1.25rem;
  }

  /* Inner double border */
  .cert-border::before {
    content: ''; position: absolute; inset: 6px;
    border: 1px solid color-mix(in srgb, #10b981 30%, transparent);
    border-radius: .5rem; pointer-events: none;
  }

  .cert-header { display: flex; align-items: center; gap: 1.25rem; }
  .cert-institution h1 { font-size: 1.1rem; font-weight: 900; color: #065f46; margin: 0 0 .2rem; line-height: 1.3; }
  .cert-system { font-size: .78rem; color: #6b7280; margin: 0; }

  .cert-divider { height: 2px; background: linear-gradient(90deg, transparent, #10b981, transparent); }

  .cert-title-block { display: flex; justify-content: center; }
  .cert-ribbon { display: inline-flex; align-items: center; gap: .5rem; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: .6rem 2rem; border-radius: 999px; font-size: .95rem; font-weight: 800; letter-spacing: .02em; }

  .cert-body { display: flex; flex-direction: column; align-items: center; gap: .6rem; text-align: center; }
  .cert-presents { font-size: .9rem; color: #6b7280; margin: 0; font-style: italic; }
  .cert-name { font-size: 2rem; font-weight: 900; color: #111827; margin: 0; letter-spacing: -.02em; }
  .cert-matric { font-size: .85rem; color: #6b7280; margin: 0; }
  .cert-dept { font-size: .82rem; color: #374151; font-weight: 600; margin: 0; }
  .cert-achievement { font-size: .9rem; color: #6b7280; margin: .25rem 0 0; font-style: italic; }

  .cert-course-block { display: flex; align-items: center; gap: .75rem; padding: .75rem 2rem; background: color-mix(in srgb,#10b981 8%,#fff); border: 1.5px solid color-mix(in srgb,#10b981 25%,transparent); border-radius: .625rem; }
  .cert-course-code { font-size: 1rem; font-weight: 900; color: #10b981; }
  .cert-course-title { font-size: .95rem; font-weight: 700; color: #111827; }

  .cert-scores { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .score-box { display: flex; flex-direction: column; align-items: center; gap: .15rem; padding: .75rem 1.25rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .5rem; min-width: 80px; }
  .score-label { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; }
  .score-value { font-size: 1.4rem; font-weight: 900; color: #111827; line-height: 1; }
  .score-value.sm { font-size: .95rem; }
  .grade-box { border-color: #10b981; background: color-mix(in srgb,#10b981 8%,#fff); }
  .grade-val { color: #10b981; }
  .cert-date { font-size: .82rem; color: #9ca3af; margin: 0; }

  .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
  .cert-sig { display: flex; flex-direction: column; gap: .25rem; }
  .sig-line { width: 140px; height: 2px; background: #111827; margin-bottom: .25rem; }
  .sig-name { font-size: .9rem; font-weight: 800; color: #111827; margin: 0; }
  .sig-title { font-size: .72rem; color: #6b7280; margin: 0; }

  .cert-qr { display: flex; flex-direction: column; align-items: center; gap: .35rem; }
  .cert-qr img { border: 1px solid #e5e7eb; border-radius: .375rem; display: block; }
  .qr-label { font-size: .65rem; color: #9ca3af; margin: 0; }

  .cert-verify { text-align: right; }
  .verify-url { font-size: .65rem; color: #10b981; margin: 0 0 .2rem; word-break: break-all; }
  .verify-id { font-size: .6rem; color: #9ca3af; margin: 0; font-family: monospace; }

  .cert-disclaimer { display: flex; align-items: flex-start; gap: .5rem; padding: .75rem; background: #fef3c7; border: 1px solid #fcd34d; border-radius: .5rem; font-size: .72rem; color: #92400e; line-height: 1.5; }

  @media print {
    .cert-toolbar { display: none; }
    .cert-page { padding: 0; }
    .certificate { box-shadow: none; }
  }
</style>