import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ca = req.nextUrl.searchParams.get("ca");
  if (!ca || !/^\d+$/.test(ca.trim())) {
    return NextResponse.json({ error: "CA inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("catalogo")
    .from("fichas_tecnicas")
    .select("ca,nome_equipamento,data_validade,situacao,cnpj_fabricante,nrprocesso")
    .eq("ca", parseInt(ca))
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, ...data });
}
