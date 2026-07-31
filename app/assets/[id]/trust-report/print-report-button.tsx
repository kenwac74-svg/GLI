"use client";

import { Printer } from "lucide-react";

export function PrintReportButton() {
  return (
    <button
      className="report-print"
      type="button"
      onClick={() => window.print()}
      title="인쇄 또는 PDF 저장"
    >
      <Printer size={17} />
      PDF로 저장
    </button>
  );
}
