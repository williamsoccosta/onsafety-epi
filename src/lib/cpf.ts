export function limparCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function formatarCpf(cpf: string): string {
  const v = limparCpf(cpf).slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Modulo 11 — valida os dois digitos verificadores do CPF.
export function cpfValido(cpf: string): boolean {
  const v = limparCpf(cpf);
  if (v.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(v)) return false; // todos os digitos iguais (000..., 111...) passam no calculo mas nao sao CPF valido

  const digitoVerificador = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += parseInt(base[i], 10) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = digitoVerificador(v.slice(0, 9), 10);
  if (d1 !== parseInt(v[9], 10)) return false;

  const d2 = digitoVerificador(v.slice(0, 10), 11);
  if (d2 !== parseInt(v[10], 10)) return false;

  return true;
}
