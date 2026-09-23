"use client";

// Opción A de docs/proposal-reportes.md §3-§9: print CSS del navegador, sin
// Chrome headless en el servidor. "Guardar como PDF" usa el <title> de la
// página como nombre de archivo sugerido (generateMetadata en page.tsx).
export default function ExportarPdfBoton() {
  return (
    <div className="print:hidden flex flex-col items-end gap-1">
      <button
        onClick={() => window.print()}
        className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg transition-colors"
      >
        Exportar a PDF
      </button>
      <p className="text-xs text-gray-500 max-w-[220px] text-right">
        En el diálogo de impresión, desactivá &quot;Encabezados y pies de
        página&quot; para un PDF más prolijo.
      </p>
    </div>
  );
}
