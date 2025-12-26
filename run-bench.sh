#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CONFIG_FILE="benchmark-config.json"
REPORT_DIR="reports/$(date +%Y-%m-%d_%H-%M-%S)"

# Verifica se o jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Erro: 'jq' não está instalado.${NC}"
    echo "Instale com: sudo apt-get install jq (ou brew install jq)"
    exit 1
fi

# Cria diretório de reports
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}🚀 INICIANDO BATERIA DE BENCHMARKS AUTOMATIZADA${NC}"
echo -e "${BLUE}📁 Resultados serão salvos em: $REPORT_DIR${NC}"
echo -e "${BLUE}====================================================${NC}\n"

# Lê configurações globais
GLOBAL_DUR=$(jq -r '.global.duration' $CONFIG_FILE)
GLOBAL_CONN=$(jq -r '.global.connections' $CONFIG_FILE)

# Arquivo temporário para o resumo
SUMMARY_FILE="$REPORT_DIR/summary.txt"
printf "%-25s | %-10s | %-12s | %-10s\n" "CENÁRIO" "REQ/SEC" "LATÊNCIA (AVG)" "SUCESSO" > "$SUMMARY_FILE"
printf "%-25s | %-10s | %-12s | %-10s\n" "-------------------------" "----------" "------------" "----------" >> "$SUMMARY_FILE"

# Loop pelos cenários do JSON
# O jq -c imprime cada objeto numa linha única para o while ler
jq -c '.scenarios[]' "$CONFIG_FILE" | while read -r scenario; do
    
    # Extrai variáveis do JSON usando jq
    NAME=$(echo "$scenario" | jq -r '.name')
    URL=$(echo "$scenario" | jq -r '.url')
    METHOD=$(echo "$scenario" | jq -r '.method // "GET"')
    BODY=$(echo "$scenario" | jq -r '.body // empty')
    
    # Usa conexão específica do cenário ou a global
    CONN=$(echo "$scenario" | jq -r ".connections // $GLOBAL_CONN")
    
    # Limpa nome para arquivo (remove espaços e chars especiais)
    SAFE_NAME=$(echo "$NAME" | tr -dc '[:alnum:]\n\r' | tr '[:upper:]' '[:lower:]')
    RESULT_FILE="$REPORT_DIR/${SAFE_NAME}.json"

    echo -e "${YELLOW}▶ Executando: $NAME${NC}"
    echo -e "  URL: $URL | Conn: $CONN | Method: $METHOD"

    # Monta o comando autocannon
    CMD="npx autocannon -c $CONN -d $GLOBAL_DUR --json"
    
    if [ "$METHOD" == "POST" ]; then
        CMD="$CMD -m POST -H 'Content-Type: application/json' -b '$BODY'"
    fi
    
    CMD="$CMD $URL"

    # Executa e salva o JSON bruto
    eval "$CMD" > "$RESULT_FILE"

    # Extrai resultados para mostrar na tela e salvar no resumo
    RPS=$(jq '.requests.average' "$RESULT_FILE")
    LATENCY=$(jq '.latency.average' "$RESULT_FILE")
    ERRORS=$(jq '.errors' "$RESULT_FILE")
    TOTAL_REQ=$(jq '.requests.total' "$RESULT_FILE")

    # Arredonda valores
    RPS_FMT=$(printf "%.0f" $RPS)
    LAT_FMT=$(printf "%.2f ms" $LATENCY)

    # Verifica se houve erros
    if [ "$ERRORS" -gt 0 ]; then
        STATUS="${RED}FAIL ($ERRORS)${NC}"
    else
        STATUS="${GREEN}100% OK${NC}"
    fi

    echo -e "  Resultado: ${GREEN}$RPS_FMT req/s${NC} | Latência: ${BLUE}$LAT_FMT${NC}"
    echo ""

    # Adiciona ao arquivo de resumo (sem cores para alinhamento)
    printf "%-25s | %-10s | %-12s | %-10s\n" "${NAME:0:25}" "$RPS_FMT" "$LAT_FMT" "$ERRORS" >> "$SUMMARY_FILE"

done

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}🏁 TABELA DE RESUMO FINAL${NC}"
echo -e "${BLUE}====================================================${NC}"
cat "$SUMMARY_FILE"
echo -e "\n${GREEN}✔ Relatórios JSON completos salvos em: $REPORT_DIR${NC}"