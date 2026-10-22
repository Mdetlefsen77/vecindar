import Image from "next/image";
import { textoPrecioPromo } from "@/lib/oficios";
import { textoVencimiento } from "@/lib/fechas";

export interface PromoVista {
  titulo: string;
  descripcion: string | null;
  precioAntes: number | null;
  precioAhora: number | null;
  imagen: string | null;
  venceAt: Date;
}

/** La promo vigente en el detalle del oficio. */
export default function TarjetaPromo({ promo }: { promo: PromoVista }) {
  const precio = textoPrecioPromo(promo);
  return (
    <section className="rounded-2xl border-2 border-orange-300 bg-orange-50 overflow-hidden">
      {promo.imagen && (
        <div className="relative aspect-[16/9] bg-orange-100">
          <Image
            src={promo.imagen}
            alt=""
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
          🔥 Promo · {textoVencimiento(promo.venceAt)}
        </p>
        <h2 className="text-lg font-bold text-gray-900">{promo.titulo}</h2>
        {precio && <p className="font-semibold text-orange-800">{precio}</p>}
        {promo.descripcion && (
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {promo.descripcion}
          </p>
        )}
      </div>
    </section>
  );
}
