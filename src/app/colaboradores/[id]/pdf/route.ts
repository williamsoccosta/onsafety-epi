import { createClient } from "@/lib/supabase/server";
import PDFDocument from "pdfkit";

export const dynamic = "force-dynamic";

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// URLs publicas de assinatura nao sao alcancaveis do host — usar Kong interno
function urlInterna(publica: string) {
  const interna = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_INTERNAL_URL;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (interna && base && publica.startsWith(base)) {
    return interna + publica.slice(base.length);
  }
  return publica;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: colab },
    { data: entregas },
    { data: obrasData },
  ] = await Promise.all([
    supabase.schema("epi").from("colaboradores").select("*").eq("id", id).single(),
    supabase.schema("epi").from("movimentacoes")
      .select("id,criado_em,quantidade,observacao,assinatura_url,obra_id,motivo,epi_id(nome,complemento,ca)")
      .eq("colaborador_id", id)
      .in("motivo", ["Entrega", "Substituicao"])
      .order("criado_em", { ascending: false }),
    supabase.schema("obras").from("obras").select("id,nome"),
  ]);

  if (!colab) {
    return new Response("Colaborador nao encontrado", { status: 404 });
  }

  const obraMap: Record<string, string> = Object.fromEntries(
    (obrasData ?? []).map((o) => [o.id, o.nome])
  );

  // Baixar assinaturas (URLs unicas) antes de montar o PDF
  const assinaturas = new Map<string, Buffer>();
  const urls = [...new Set((entregas ?? []).map((e) => e.assinatura_url).filter(Boolean))] as string[];
  await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(urlInterna(url));
      if (res.ok) assinaturas.set(url, Buffer.from(await res.arrayBuffer()));
    } catch { /* assinatura indisponivel — celula fica vazia */ }
  }));

  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const fim = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const LARG = doc.page.width - 80; // util

  // Cabecalho
  doc.fontSize(8).fillColor("#b45309").font("Helvetica-Bold")
    .text("FICHA DE EPI — FAAB ENGENHARIA LTDA", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(18).fillColor("#111").text(colab.nome);
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#555").font("Helvetica")
    .text(
      `Funcao: ${colab.funcao}   ·   Matricula: ${colab.matricula ?? "—"}   ·   ` +
      `Admissao: ${fmtData(colab.data_admissao)}   ·   Situacao: ${colab.ativo ? "Ativo" : "Inativo"}`
    );
  doc.moveDown(0.6);
  doc.moveTo(40, doc.y).lineTo(40 + LARG, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.6);

  // Tabela
  const cols = { data: 60, epi: 150, ca: 45, obra: 95, qtd: 25, ass: 110 };
  const xs = (() => {
    let x = 40;
    const r: Record<string, number> = {};
    for (const [k, w] of Object.entries(cols)) { r[k] = x; x += w + 6; }
    return r;
  })();

  function cabecalhoTabela() {
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#777");
    doc.text("DATA", xs.data, doc.y, { width: cols.data, continued: false });
    const y = doc.y - 9;
    doc.text("EQUIPAMENTO", xs.epi, y, { width: cols.epi });
    doc.text("CA", xs.ca, y - 9, { width: cols.ca });
    doc.text("OBRA", xs.obra, y - 9, { width: cols.obra });
    doc.text("QTD", xs.qtd, y - 9, { width: cols.qtd });
    doc.text("ASSINATURA", xs.ass, y - 9, { width: cols.ass });
    doc.moveDown(0.4);
    doc.moveTo(40, doc.y).lineTo(40 + LARG, doc.y).strokeColor("#ddd").stroke();
    doc.moveDown(0.3);
  }

  cabecalhoTabela();

  doc.font("Helvetica").fontSize(8).fillColor("#222");
  for (const e of entregas ?? []) {
    const epi = e.epi_id as unknown as { nome: string; complemento: string | null; ca: string | null } | null;
    const linhaAltura = 34;

    if (doc.y + linhaAltura > doc.page.height - 100) {
      doc.addPage();
      cabecalhoTabela();
      doc.font("Helvetica").fontSize(8).fillColor("#222");
    }

    const y0 = doc.y;
    doc.fillColor("#666").text(fmtData(e.criado_em), xs.data, y0, { width: cols.data });
    doc.fillColor("#222").font("Helvetica-Bold")
      .text(epi?.nome ?? "—", xs.epi, y0, { width: cols.epi });
    doc.font("Helvetica").fillColor("#666");
    const sub = [epi?.complemento, e.motivo === "Substituicao" ? "Substituicao" : null]
      .filter(Boolean).join(" · ");
    if (sub) doc.fontSize(7).text(sub, xs.epi, doc.y, { width: cols.epi });
    doc.fontSize(8).fillColor("#b45309")
      .text(epi?.ca ? String(epi.ca) : "—", xs.ca, y0, { width: cols.ca });
    doc.fillColor("#444").text(obraMap[e.obra_id as string] ?? "—", xs.obra, y0, { width: cols.obra });
    doc.fillColor("#222").text(String(Math.abs(e.quantidade as number)), xs.qtd, y0, { width: cols.qtd });

    const img = e.assinatura_url ? assinaturas.get(e.assinatura_url as string) : null;
    if (img) {
      try {
        doc.image(img, xs.ass, y0 - 2, { fit: [cols.ass, 26] });
      } catch { /* png invalido */ }
    } else {
      doc.fillColor("#999").text("(sem assinatura)", xs.ass, y0, { width: cols.ass });
    }

    doc.y = y0 + linhaAltura;
    doc.x = 40;
    doc.moveTo(40, doc.y - 6).lineTo(40 + LARG, doc.y - 6).strokeColor("#eee").stroke();
  }

  if ((entregas ?? []).length === 0) {
    doc.fontSize(9).fillColor("#888").text("Nenhuma entrega registrada.", 40, doc.y);
    doc.moveDown(1);
  }

  // Declaracao NR-06
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(1.2);
  doc.fontSize(7.5).fillColor("#555").text(
    "Declaro ter recebido os Equipamentos de Protecao Individual (EPIs) listados acima em perfeito " +
    "estado de conservacao, comprometendo-me a utiliza-los sempre que necessario, conserva-los " +
    "adequadamente e devolver quando solicitado, conforme determina a NR-06, item 6.6.1, alinea h) " +
    "da Portaria MTb n 3.214/78 e suas alteracoes.",
    40, doc.y, { width: LARG, align: "justify" }
  );
  doc.moveDown(1);
  doc.fontSize(7).fillColor("#999").text(
    `Documento gerado em ${new Date().toLocaleString("pt-BR")} · Onsafety EPI / FAAB Engenharia Ltda`,
    { width: LARG }
  );

  doc.end();
  const pdf = await fim;

  const nomeArquivo = "ficha-epi-" + String(colab.nome).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-") + ".pdf";

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
