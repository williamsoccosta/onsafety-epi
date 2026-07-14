"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { criarFuncionario } from "../actions";
import { cpfValido } from "@/lib/cpf";

export function NovoFuncionarioForm({
  nomeInicial,
  colaboradorId,
}: {
  nomeInicial: string;
  colaboradorId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const step1HeadingRef = useRef<HTMLHeadingElement>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement>(null);

  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [cpfErro, setCpfErro] = useState<string | null>(null);
  const [telefoneErro, setTelefoneErro] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<{ id: string; nome: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function avancar() {
    const fd = new FormData(formRef.current!);
    const nome = String(fd.get("nome") || "").trim();
    const cpf = String(fd.get("cpf") || "");
    const telefone = String(fd.get("telefone") || "").trim();

    if (!nome) {
      setCpfErro(null);
      setTelefoneErro(null);
      (formRef.current!.elements.namedItem("nome") as HTMLInputElement)?.focus();
      return;
    }
    if (!cpfValido(cpf)) {
      setCpfErro("CPF invalido — confira os digitos.");
      setTelefoneErro(null);
      (formRef.current!.elements.namedItem("cpf") as HTMLInputElement)?.focus();
      return;
    }
    if (!telefone) {
      setCpfErro(null);
      setTelefoneErro("Telefone e obrigatorio.");
      (formRef.current!.elements.namedItem("telefone") as HTMLInputElement)?.focus();
      return;
    }

    setCpfErro(null);
    setTelefoneErro(null);
    setEtapa(2);
    // move o foco para o titulo da nova etapa apos o proximo paint
    requestAnimationFrame(() => step2HeadingRef.current?.focus());
  }

  function voltar() {
    setEtapa(1);
    requestAnimationFrame(() => step1HeadingRef.current?.focus());
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!cpfValido(String(fd.get("cpf") || ""))) {
      setEtapa(1);
      setCpfErro("CPF invalido — confira os digitos.");
      requestAnimationFrame(() => step1HeadingRef.current?.focus());
      return;
    }
    if (!String(fd.get("telefone") || "").trim()) {
      setEtapa(1);
      setTelefoneErro("Telefone e obrigatorio.");
      requestAnimationFrame(() => step1HeadingRef.current?.focus());
      return;
    }
    setErro(null);
    setDuplicado(null);
    setLoading(true);
    if (colaboradorId) fd.set("colaborador_id", colaboradorId);
    const res = await criarFuncionario(fd);
    if (res?.error) {
      setErro(res.error);
      setDuplicado(res.duplicado ?? null);
      setLoading(false);
      if (res.duplicado) {
        setEtapa(1);
        requestAnimationFrame(() => step1HeadingRef.current?.focus());
      }
    } else {
      router.push("/rh");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {duplicado && (
        <p
          role="alert"
          className="rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          CPF ja cadastrado para {duplicado.nome}.{" "}
          <Link href={"/rh/" + duplicado.id} className="underline font-semibold">
            Ver ficha existente
          </Link>
        </p>
      )}
      <StepIndicator etapa={etapa} />
      <p className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
        * campos obrigatorios
      </p>

      {/* Etapa 1 — dados basicos. Fica sempre montada (so escondida) para nao perder valor ao voltar. */}
      <div hidden={etapa !== 1} className="space-y-6">
        <Secao titulo="Dados basicos" headingRef={step1HeadingRef}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nome completo" name="nome" defaultValue={nomeInicial} required className="sm:col-span-2" />
            <Campo
              label="CPF"
              name="cpf"
              placeholder="000.000.000-00"
              required
              erro={cpfErro ?? undefined}
              onChange={() => cpfErro && setCpfErro(null)}
            />
            <Campo
              label="Telefone"
              name="telefone"
              placeholder="(00) 00000-0000"
              required
              erro={telefoneErro ?? undefined}
              onChange={() => telefoneErro && setTelefoneErro(null)}
            />
            <Campo label="E-mail" name="email" type="email" className="sm:col-span-2" />
          </div>
        </Secao>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={avancar}
            className="h-11 px-6 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90 campo-foco"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Avancar
          </button>
        </div>
      </div>

      {/* Etapa 2 — dados complementares */}
      <div hidden={etapa !== 2} className="space-y-6">
        <Secao titulo="Dados complementares" headingRef={step2HeadingRef}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoSelect label="Sexo" name="sexo">
              <option value="">—</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </CampoSelect>
            <Campo label="Data nascimento" name="data_nascimento" type="date" />
            <CampoSelect label="Raca" name="raca">
              <option value="">—</option>
              <option value="branca">Branca</option>
              <option value="preta">Preta</option>
              <option value="parda">Parda</option>
              <option value="amarela">Amarela</option>
              <option value="indigena">Indigena</option>
              <option value="nao_informada">Nao informada</option>
            </CampoSelect>
            <Campo label="Nacionalidade" name="nacionalidade" defaultValue="Brasileira" />
            <Campo label="Naturalidade" name="naturalidade" placeholder="Ex: Recife/PE" />
            <CampoSelect label="Grau instrucao" name="grau_instrucao">
              <option value="">—</option>
              <option value="analfabeto">Analfabeto</option>
              <option value="fundamental_incompleto">Fundamental incompleto</option>
              <option value="fundamental_completo">Fundamental completo</option>
              <option value="medio_incompleto">Medio incompleto</option>
              <option value="medio_completo">Medio completo</option>
              <option value="superior_incompleto">Superior incompleto</option>
              <option value="superior_completo">Superior completo</option>
              <option value="pos_graduacao">Pos-graduacao</option>
              <option value="mestrado">Mestrado</option>
              <option value="doutorado">Doutorado</option>
            </CampoSelect>
            <Campo label="Nome do pai" name="nome_pai" />
            <Campo label="Nome da mae" name="nome_mae" />
            <CampoSelect label="Estado civil" name="estado_civil">
              <option value="">—</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viuvo(a)</option>
              <option value="separado">Separado(a)</option>
              <option value="uniao_estavel">Uniao estavel</option>
            </CampoSelect>
            <Campo label="Regime casamento" name="regime_casamento" placeholder="Ex: comunhao parcial" />
            <Campo label="Data casamento" name="data_casamento" type="date" />
          </div>
        </Secao>

        <Secao titulo="Documentos">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="CTPS numero" name="ctps_numero" />
            <Campo label="CTPS serie" name="ctps_serie" />
            <Campo label="CTPS UF" name="ctps_uf" placeholder="PE" />
            <Campo label="PIS/PASEP" name="pis_pasep" className="sm:col-span-3" />
            <Campo label="RG numero" name="rg_numero" />
            <Campo label="Orgao emissor" name="rg_orgao" placeholder="SDS" />
            <Campo label="RG UF" name="rg_uf" placeholder="PE" />
            <Campo label="RG expedicao" name="rg_expedicao" type="date" />
          </div>
        </Secao>

        <Secao titulo="Endereco">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="CEP" name="cep" placeholder="00000-000" />
            <Campo label="Logradouro" name="logradouro" className="sm:col-span-2" />
            <Campo label="Numero" name="numero" />
            <Campo label="Complemento" name="complemento" />
            <Campo label="Bairro" name="bairro" />
            <Campo label="Municipio" name="municipio" />
            <Campo label="UF" name="endereco_uf" placeholder="PE" />
          </div>
        </Secao>

        <Secao titulo="Dados bancarios">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="Banco" name="banco" placeholder="Ex: Bradesco" />
            <Campo label="Agencia" name="agencia" />
            <Campo label="Digito ag." name="agencia_digito" />
            <Campo label="Conta" name="conta" />
            <Campo label="Digito conta" name="conta_digito" />
            <CampoSelect label="Tipo conta" name="conta_tipo">
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupanca</option>
            </CampoSelect>
            <Campo label="PIX" name="pix" placeholder="CPF, e-mail ou telefone" className="sm:col-span-3" />
          </div>
        </Secao>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={voltar}
              className="h-11 px-5 rounded-md border text-[13px] font-semibold transition-colors campo-foco"
              style={{ borderColor: "var(--control-border)", color: "var(--ink-secondary)" }}
            >
              Voltar
            </button>
            {erro && (
              <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>
                {erro}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-6 rounded-md text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 campo-foco"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {loading ? "Salvando..." : "Cadastrar funcionario"}
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {loading ? "Salvando cadastro..." : ""}
          </span>
        </div>
      </div>
    </form>
  );
}

function StepIndicator({ etapa }: { etapa: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[12px] font-semibold" style={{ color: "var(--ink-secondary)" }}>
        Etapa {etapa} de 2 — {etapa === 1 ? "dados basicos" : "dados complementares"}
      </p>
      <div aria-hidden="true" className="flex gap-1.5">
        {[1, 2].map((n) => (
          <span
            key={n}
            className="h-1.5 w-6 rounded-full"
            style={{ background: n <= etapa ? "var(--accent)" : "var(--line-strong)" }}
          />
        ))}
      </div>
    </div>
  );
}

function Secao({
  titulo, children, headingRef,
}: {
  titulo: string; children: React.ReactNode; headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section
      className="rounded-lg border p-5 space-y-4"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] outline-none"
        style={{ color: "var(--ink-tertiary)" }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Campo({
  label, name, placeholder, type = "text", required = false, mono = false, className = "", defaultValue, erro, onChange,
}: {
  label: string; name: string; placeholder?: string; type?: string;
  required?: boolean; mono?: boolean; className?: string; defaultValue?: string;
  erro?: string; onChange?: () => void;
}) {
  const erroId = erro ? `${name}-erro` : undefined;
  return (
    <label className={"flex flex-col gap-1.5 " + className}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-secondary)" }}>
        {label}{required && " *"}
      </span>
      <input
        name={name} type={type} placeholder={placeholder} required={required}
        defaultValue={defaultValue}
        onChange={onChange}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erroId}
        className={"h-11 rounded-md border px-3 text-[13px] outline-none campo-foco " + (mono ? "tabular" : "")}
        style={{
          background: "var(--control-bg)",
          borderColor: erro ? "var(--danger)" : "var(--control-border)",
          color: "var(--ink)",
        }}
      />
      {erro && (
        <span id={erroId} role="alert" className="text-[12px]" style={{ color: "var(--danger)" }}>
          {erro}
        </span>
      )}
    </label>
  );
}

function CampoSelect({
  label, name, children, className = "",
}: {
  label: string; name: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={"flex flex-col gap-1.5 " + className}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--ink-secondary)" }}>
        {label}
      </span>
      <select
        name={name}
        className="h-11 rounded-md border px-3 text-[13px] outline-none campo-foco"
        style={{ background: "var(--control-bg)", borderColor: "var(--control-border)", color: "var(--ink)" }}
      >
        {children}
      </select>
    </label>
  );
}
