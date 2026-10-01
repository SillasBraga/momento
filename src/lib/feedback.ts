const LEVEL_UP_MESSAGES: Record<number, string> = {
  2: "Você começou a construir algo novo.",
  3: "A constância começa a aparecer.",
  4: "Cada escolha está fortalecendo seu caminho.",
  5: "Sua evolução já merece ser reconhecida.",
  6: "O que antes parecia difícil começa a virar força.",
  7: "Disciplina está se transformando em identidade.",
  8: "Seu progresso é feito de muitas pequenas escolhas.",
  9: "Continue. Sua história é maior que um momento difícil.",
  10: "Você construiu algo que merece ser protegido.",
};

export function levelUpMessage(level: number): string {
  return LEVEL_UP_MESSAGES[level] ?? "Sua constância continua abrindo novos caminhos.";
}

export const RELAPSE_MESSAGES = [
  "O contador recomeçou. Seu progresso não.",
  "Uma queda não apaga o caminho que você já percorreu. Comece novamente a partir daqui.",
  "Não transforme um momento difícil em desistência. O próximo minuto já conta.",
] as const;
