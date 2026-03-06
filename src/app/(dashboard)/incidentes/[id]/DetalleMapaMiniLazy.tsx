"use client";

import dynamic from "next/dynamic";

const DetalleMapaMini = dynamic(() => import("./DetalleMapaMini"), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />,
});

export default DetalleMapaMini;
