// afterPack hook do Chronos IDE.
// Ponto para enxugar arquivos empacotados (reduzir tamanho do instalador) no futuro.
// Em v0.1 é um no-op seguro.
module.exports = async function afterPack(/* context */) {
  // Ex.: remover sourcemaps, locales não usados do Electron, etc.
  return;
};
