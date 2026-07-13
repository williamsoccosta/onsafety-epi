"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cadastrarInsumo } from "../actions";

type Seg = { id: string; codigo: string; nome: string };
type Cat = { id: string; codigo: string; nome: string; segmento_id: string };
type Tip = { id: string; codigo: string; nome: string; categoria_id: string };

const UNIDADES_DIAMETRO = ["-", "MM", "POL", "AWG", "MCM / KCMIL"];
const UNIDADES_ESPESSURA = ["-", "MM", "POL", "CM", "M"];
const UNIDADES_LARGURA = ["-", "MM", "CM", "M", "KM"];
const UNIDADES_COMPRIMENTO = ["-", "MM", "CM", "M", "KM"];
const UNIDADES_CAPACIDADE = ["-", "MM3", "CM3", "M3", "ML", "L", "MG", "G", "KG", "T"];

const APRESENTACOES = [
  "UNIDADE", "METRO", "METRO QUADRADO", "METRO CUBICO",
  "QUILO", "LITRO", "TONELADA", "PECA", "ROLO",
  "PACOTE", "CAIXA", "SACO", "BARRA", "BOBINA",
  "GALAO", "LATA", "BALDE", "CARRETEL",
];

const GRUPOS_INSUMO = [
  "1 - Mao de Obra",
  "2 - Material",
  "3 - Equipamento",
  "4 - Servico",
  "5 - Outros",
];

const UNIDADES_ERP = [
  "un", "m", "m2", "m3", "kg", "L", "t",
  "pc", "rl", "cx", "sc", "br", "bb",
  "gl", "lt", "bd", "vb", "cj", "pt",
];

const CONTROLES = [
  "1 - Material",
  "2 - Verba",
  "3 - Servico",
];

const PAGAMENTOS = [
  "1 - ENTREGA",
  "2 - MEDICAO",
  "3 - MENSAL",
];

export function NovoInsumoForm({
  segmentos, categorias, tipos,
  segmentoInicial, categoriaInicial, tipoInicial,
}: {
  segmentos: Seg[]; categorias: Cat[]; tipos: Tip[];
  segmentoInicial: string; categoriaInicial: string; tipoInicial: string;
}) {
  const router = useRouter();
  const [segId, setSegId] = useState(segmentoInicial);
  const [catId, setCatId] = useState(categoriaInicial);
  const [tipId, setTipId] = useState(tipoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Campos do formulário para preview ERP
  const [nome, setNome] = useState("");
  const [materialAcab, setMaterialAcab] = useState("");
  const [diametro, setDiametro] = useState("");
  const [unDiametro, setUnDiametro] = useState("-");
  const [espessura, setEspessura] = useState("");
  const [unEspessura, setUnEspessura] = useState("-");
  const [largura, setLargura] = useState("");
  const [unLargura, setUnLargura] = useState("-");
  const [comprimento, setComprimento] = useState("");
  const [unComprimento, setUnComprimento] = useState("-");
  const [capacidade, setCapacidade] = useState("");
  const [unCapacidade, setUnCapacidade] = useState("-");
  const [outras, setOutras] = useState("");
  const [apresentacao, setApresentacao] = useState("UNIDADE");

  const catsFiltradas = segId ? categorias.filter((c) => c.segmento_id === segId) : [];
  const tiposFiltrados = catId ? tipos.filter((t) => t.categoria_id === catId) : [];

  // Preview ERP: NOME MATERIAL OUTRAS DIAM. X ESP. Y LARG. Z - APRESENTACAO
  // Excecao: diametro em rosca metrica (M20) e autodescritivo, sem rotulo.
  const previewERP = useMemo(() => {
    function medida(label: string, valor: string, unidade: string) {
      if (!valor || valor === "0" || valor === "0,00") return null;
      if (/^m/i.test(valor.trim())) return valor.toUpperCase();
      return unidade !== "-" ? `${label}. ${valor}${unidade}` : `${label}. ${valor}`;
    }
    const partes: string[] = [];
    if (nome) partes.push(nome.toUpperCase());
    if (materialAcab) partes.push(materialAcab.toUpperCase());
    if (outras) partes.push(outras.toUpperCase());
    const d = medida("DIAM", diametro, unDiametro); if (d) partes.push(d);
    const e = medida("ESP", espessura, unEspessura); if (e) partes.push(e);
    const l = medida("LARG", largura, unLargura); if (l) partes.push(l);
    const c = medida("COMP", comprimento, unComprimento); if (c) partes.push(c);
    const cap = medida("CAP", capacidade, unCapacidade); if (cap) partes.push(cap);
    const corpo = partes.join(" ");
    return (corpo ? corpo + " - " : "") + apresentacao;
  }, [nome, materialAcab, outras, diametro, unDiametro, espessura, unEspessura, largura, unLargura, comprimento, unComprimento, capacidade, unCapacidade, apresentacao]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) { setErro("Apenas o nome! Sem medidas."); return; }
    if (!segId || !catId || !tipId) { setErro("Selecione segmento, categoria e tipo."); return; }
    if (diametro && unDiametro === "-" && diametro !== "0" && diametro !== "0,00" && diametro !== "") {
      setErro("Selecione a unidade para a medida preenchida!"); return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("segmento_id", segId);
    fd.set("categoria_id", catId);
    fd.set("tipo_id", tipId);
    fd.set("nome", nome);
    fd.set("material_acabamento", materialAcab);

    // Montar unidades nos campos
    if (unDiametro !== "-") fd.set("unidade_diametro", unDiametro);
    if (unEspessura !== "-") fd.set("unidade_espessura", unEspessura);
    if (unLargura !== "-") fd.set("unidade_largura", unLargura);
    if (unComprimento !== "-") fd.set("unidade_comprimento", unComprimento);
    if (unCapacidade !== "-") fd.set("unidade_capacidade", unCapacidade);
    fd.set("outras_caracteristicas", outras);
    fd.set("apresentacao", apresentacao);
    fd.set("preview_erp", previewERP);

    const res = await cadastrarInsumo(fd);
    if (res?.error) { setErro(res.error); setLoading(false); }
    else router.push("/materiais");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Título */}
      <div className="text-center pb-4 mb-6" style={{ borderBottom: "3px solid var(--accent)" }}>
        <h2 className="text-[20px] font-semibold" style={{ color: "var(--ink)" }}>Novo Insumo</h2>
      </div>

      {/* Classificação */}
      <Secao titulo="Classificacao">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CampoSelect label="Segmento *" value={segId}
            onChange={(v) => { setSegId(v); setCatId(""); setTipId(""); }}
            options={segmentos.map((s) => ({ value: s.id, label: `${s.codigo} · ${s.nome}` }))} />
          <CampoSelect label="Categoria *" value={catId}
            onChange={(v) => { setCatId(v); setTipId(""); }}
            options={catsFiltradas.map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nome}` }))} />
          <CampoSelect label="Tipo *" value={tipId} onChange={setTipId}
            options={tiposFiltrados.map((t) => ({ value: t.id, label: `${t.codigo} · ${t.nome}` }))} />
        </div>
      </Secao>

      {/* 1. IDENTIFICAÇÃO */}
      <Secao titulo="1. Identificacao" accent>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>
              Nome do Insumo (Objeto)
            </label>
            <input value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder='Ex: Cabo "OPGW"' required
              className="w-full h-[42px] rounded-md border px-3 text-[14px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
            {erro === "Apenas o nome! Sem medidas." && (
              <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "var(--danger)" }}>
                ⊖ Apenas o nome! Sem medidas.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>
              Material / Acabamento
            </label>
            <input value={materialAcab} onChange={(e) => setMaterialAcab(e.target.value)}
              placeholder="Ex: Aço com Carbono"
              className="w-full h-[42px] rounded-md border px-3 text-[14px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
          </div>
        </div>
      </Secao>

      {/* 2. CARACTERÍSTICAS TÉCNICAS */}
      <Secao titulo="2. Caracteristicas tecnicas" accent>
        <div className="space-y-3">
          {erro === "Selecione a unidade para a medida preenchida!" && (
            <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--danger)" }}>
              ⊖ Selecione a unidade para a medida preenchida!
            </p>
          )}

          <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            <MedidaRow label="Diametro" value={diametro} onChange={setDiametro}
              unidade={unDiametro} onUnidadeChange={setUnDiametro}
              unidades={UNIDADES_DIAMETRO} placeholder="0,00 ou M..." name="diametro" permitirM />
            <MedidaRow label="Espessura" value={espessura} onChange={setEspessura}
              unidade={unEspessura} onUnidadeChange={setUnEspessura}
              unidades={UNIDADES_ESPESSURA} placeholder="0,00" name="espessura" />
            <MedidaRow label="Largura" value={largura} onChange={setLargura}
              unidade={unLargura} onUnidadeChange={setUnLargura}
              unidades={UNIDADES_LARGURA} placeholder="0,00" name="largura" />
            <MedidaRow label="Comprimento" value={comprimento} onChange={setComprimento}
              unidade={unComprimento} onUnidadeChange={setUnComprimento}
              unidades={UNIDADES_COMPRIMENTO} placeholder="0,00" name="comprimento" />
            <MedidaRow label="Capacidade" value={capacidade} onChange={setCapacidade}
              unidade={unCapacidade} onUnidadeChange={setUnCapacidade}
              unidades={UNIDADES_CAPACIDADE} placeholder="0,00" name="capacidade" last />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>
              Outras Caracteristicas{" "}
              <span className="font-normal" style={{ color: "var(--ink-muted)" }}>
                (Use &quot; &quot; para evitar formatacao de numeros. Ex: &quot;DS1.049&quot;)
              </span>
            </label>
            <input value={outras} onChange={(e) => setOutras(e.target.value)}
              placeholder='Ex: Pot. 75 kV; Res. 35 MPa"'
              className="w-full h-[42px] rounded-md border px-3 text-[14px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>
              Apresentacao (Compra)
            </label>
            <select value={apresentacao} onChange={(e) => setApresentacao(e.target.value)}
              className="w-full h-[42px] rounded-md border px-3 text-[14px] outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
              {APRESENTACOES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Visualização Padrão ERP */}
          <div className="rounded-md p-4" style={{ background: "var(--accent-soft)", borderLeft: "4px solid var(--accent)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: "var(--accent)" }}>
              Visualizacao padrao ERP:
            </p>
            <p className="text-[13px] font-medium tabular" style={{ color: "var(--ink)" }}>
              {previewERP}
            </p>
          </div>
        </div>
      </Secao>

      {/* 3. PARÂMETROS ADMINISTRATIVOS */}
      <Secao titulo="3. Parametros administrativos" accent>
        <div className="space-y-4">
          <SelectField label="Grupo de Insumo" name="grupo_insumo" options={GRUPOS_INSUMO} />
          <SelectField label="Unidade (ERP)" name="unidade_erp" options={UNIDADES_ERP} defaultValue="un" />

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>
              Valor (R$)
            </label>
            <input name="valor" type="number" step="0.01" min="0" placeholder="0,00"
              className="w-full h-[42px] rounded-md border px-3 text-[14px] tabular outline-none"
              style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
          </div>

          <SelectField label="Controla Estoque?" name="controla_estoque"
            options={["0 - NAO", "1 - SIM"]} defaultValue="0 - NAO" />
          <SelectField label="Controle" name="tipo_controle" options={CONTROLES} defaultValue="2 - Verba" />
          <SelectField label="Tipo Pagto" name="tipo_pagamento" options={PAGAMENTOS} defaultValue="1 - ENTREGA" />
        </div>
      </Secao>

      {/* Submit */}
      <div className="pt-6">
        {erro && erro !== "Apenas o nome! Sem medidas." && erro !== "Selecione a unidade para a medida preenchida!" && (
          <p className="text-[13px] mb-3" style={{ color: "var(--danger)" }}>{erro}</p>
        )}
        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-md text-[14px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {loading ? "Cadastrando..." : "Cadastrar Insumo"}
        </button>
      </div>
    </form>
  );
}

function Secao({ titulo, children, accent }: { titulo: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <section className="py-5" style={{ borderBottom: "1px dashed var(--line)" }}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] mb-4"
        style={{ color: accent ? "var(--accent)" : "var(--ink-tertiary)" }}>
        {titulo}
      </p>
      {children}
    </section>
  );
}

function filtrarNumerico(v: string, permitirM: boolean) {
  const padrao = permitirM ? /[^0-9.,mM]/g : /[^0-9.,]/g;
  const limpo = v.replace(padrao, "");
  return permitirM ? limpo.replace(/m/g, "M") : limpo;
}

function MedidaRow({ label, value, onChange, unidade, onUnidadeChange, unidades, placeholder, name, permitirM = false, last = false }: {
  label: string; value: string; onChange: (v: string) => void;
  unidade: string; onUnidadeChange: (v: string) => void;
  unidades: string[]; placeholder: string; name: string; permitirM?: boolean; last?: boolean;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr_100px] items-center gap-2 px-3 py-1.5"
      style={{
        background: "var(--surface)",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
      }}>
      <label className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>{label}</label>
      <input name={name} value={value}
        onChange={(e) => onChange(filtrarNumerico(e.target.value, permitirM))}
        inputMode="decimal"
        placeholder={placeholder}
        className="h-[30px] rounded border px-2 text-[13px] tabular outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }} />
      <select value={unidade} onChange={(e) => onUnidadeChange(e.target.value)}
        className="h-[30px] rounded border px-1.5 text-[12px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
        {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}

function SelectField({ label, name, options, defaultValue }: {
  label: string; name: string; options: string[]; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>{label}</label>
      <select name={name} defaultValue={defaultValue}
        className="w-full h-[42px] rounded-md border px-3 text-[14px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CampoSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--ink)" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-[42px] rounded-md border px-3 text-[14px] outline-none"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}>
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
