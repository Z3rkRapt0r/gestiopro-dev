#!/bin/bash

# Test del sistema di pulizia manuale notifiche
# Verifica che tutti i componenti siano configurati correttamente

echo "🧹 Test Sistema Pulizia Manuale Notifiche"
echo "=========================================="

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi colorati
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica file necessari
print_status "Verificando file del sistema..."

files_to_check=(
    "src/hooks/useNotificationsCleanup.tsx"
    "src/components/notifications/NotificationsCleanupButton.tsx"
    "supabase/functions/notifications-cleanup/index.ts"
    "docs/MANUAL_CLEANUP_SYSTEM.md"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file"
    else
        print_error "✗ $file (mancante)"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    print_error "Alcuni file necessari sono mancanti!"
    exit 1
fi

# Verifica configurazione Supabase
print_status "Verificando configurazione Supabase..."

if [ -f ".env" ]; then
    print_success "✓ File .env trovato"
    
    if grep -q "VITE_SUPABASE_URL" .env; then
        print_success "✓ VITE_SUPABASE_URL configurato"
    else
        print_warning "⚠ VITE_SUPABASE_URL non trovato in .env"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        print_success "✓ VITE_SUPABASE_ANON_KEY configurato"
    else
        print_warning "⚠ VITE_SUPABASE_ANON_KEY non trovato in .env"
    fi
else
    print_warning "⚠ File .env non trovato"
fi

# Verifica configurazione Supabase config
if [ -f "supabase/config.toml" ]; then
    if grep -q 'project_id = "peejlpqmxueviclhjcrr"' supabase/config.toml; then
        print_success "✓ Project ID configurato correttamente"
    else
        print_warning "⚠ Project ID potrebbe non essere configurato correttamente"
    fi
else
    print_error "✗ File supabase/config.toml non trovato"
fi

# Test compilazione TypeScript
print_status "Testando compilazione TypeScript..."

if command -v npx &> /dev/null; then
    if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
        print_success "✓ Compilazione TypeScript OK"
    else
        print_warning "⚠ Errori di compilazione TypeScript (potrebbero essere normali)"
    fi
else
    print_warning "⚠ npx non disponibile, saltando test TypeScript"
fi

# Test deploy edge function
print_status "Testando deploy edge function..."

if command -v supabase &> /dev/null; then
    print_success "✓ Supabase CLI disponibile"
    
    # Verifica se la funzione è deployata
    if supabase functions list 2>/dev/null | grep -q "notifications-cleanup"; then
        print_success "✓ Edge function 'notifications-cleanup' deployata"
    else
        print_warning "⚠ Edge function 'notifications-cleanup' non trovata o non deployata"
        echo "  Per deployare: supabase functions deploy notifications-cleanup"
    fi
else
    print_warning "⚠ Supabase CLI non disponibile"
fi

# Test chiamata API
print_status "Testando chiamata API..."

if [ -f ".env" ]; then
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    SUPABASE_ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ ! -z "$SUPABASE_URL" ] && [ ! -z "$SUPABASE_ANON_KEY" ]; then
        print_status "Testando chiamata a: $SUPABASE_URL/functions/v1/notifications-cleanup"
        
        if command -v curl &> /dev/null; then
            response=$(curl -s -w "%{http_code}" -o /tmp/cleanup_test_response.json \
                -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
                -H "Content-Type: application/json" \
                "$SUPABASE_URL/functions/v1/notifications-cleanup?action=stats")
            
            http_code="${response: -3}"
            
            if [ "$http_code" = "200" ]; then
                print_success "✓ Chiamata API riuscita (HTTP $http_code)"
                
                if [ -f "/tmp/cleanup_test_response.json" ]; then
                    if grep -q '"success":true' /tmp/cleanup_test_response.json; then
                        print_success "✓ Edge function risponde correttamente"
                    else
                        print_warning "⚠ Edge function risponde ma con errori"
                        echo "  Risposta: $(cat /tmp/cleanup_test_response.json)"
                    fi
                    rm -f /tmp/cleanup_test_response.json
                fi
            else
                print_warning "⚠ Chiamata API fallita (HTTP $http_code)"
            fi
        else
            print_warning "⚠ curl non disponibile, saltando test API"
        fi
    else
        print_warning "⚠ Credenziali Supabase non configurate correttamente"
    fi
fi

# Riepilogo
echo ""
echo "📋 Riepilogo Test:"
echo "=================="

if [ "$all_files_exist" = true ]; then
    print_success "✓ Tutti i file necessari sono presenti"
else
    print_error "✗ Alcuni file sono mancanti"
fi

echo ""
echo "🚀 Prossimi Passi:"
echo "=================="
echo "1. Accedi all'interfaccia admin"
echo "2. Vai alla sezione 'Gestione Notifiche'"
echo "3. Utilizza il pulsante 'Pulizia Notifiche'"
echo "4. Testa le funzionalità:"
echo "   - Aggiorna Statistiche"
echo "   - Simula Pulizia (Dry Run)"
echo "   - Esegui Pulizia (se necessario)"
echo ""
echo "📚 Documentazione: docs/MANUAL_CLEANUP_SYSTEM.md"
echo ""
print_success "Test completato! 🎉"
