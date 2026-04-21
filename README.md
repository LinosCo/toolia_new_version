# Toolia Studio

Piattaforma SaaS multi-tenant per creare audioguide AI per siti culturali.
Output di ogni progetto = web app funzionante che il visitatore apre sul telefono in loco.

## Struttura della cartella

```
Toolia Studio - Tech Repo/
├── CLAUDE.md                     Istruzioni per Claude Code quando lavora qui
├── README.md                     Questo file
├── docs/
│   ├── spec/                     Spec funzionale autorevole (cosa deve fare il prodotto)
│   │   ├── 01-overview.md
│   │   ├── 02-flusso-inserimento-dati.md
│   │   └── 03-data-model.md
│   ├── presentazione/
│   │   └── presentazione-app.pdf  Pitch commerciale con screenshot dell'app visitatore
│   └── legacy/                   Documentazione originale più dettagliata (13 step plans + 14 spec)
│       ├── README.md              Indice e regole d'uso
│       ├── plans/                 Step plans dettagliati (step1.md ... step13.md)
│       └── specs/                 Spec tecniche estese
├── fixtures/                     Materiali di test per sviluppo locale
│   └── forte-monte-tesoro/       Documenti di esempio per un progetto demo
│       ├── architettura.txt
│       ├── storia.txt
│       ├── territorio.txt
│       └── visita.txt
└── mvp/                          Progetto Next.js in costruzione
    ├── src/                      Codice sorgente
    ├── public/                   File statici (foto di esempio per card)
    ├── prisma/                   Schema DB (non ancora collegato, MVP su IndexedDB)
    └── package.json
```

## Come avviare in locale

```bash
cd mvp
npm run dev
```

Apri http://localhost:3001

## Dove stiamo

MVP in costruzione. Stato corrente:

- Dashboard progetti con griglia/lista, filtri, ricerca
- Creazione progetto (nome, tipo, foto, indirizzo, link Maps)
- Impostazioni (profilo, workspace, chiavi API, team, aspetto)
- **Step 1 Fonti** focus testuale: 5 sub-step (planimetria → sito → documenti → intervista → Knowledge Base)
  - Tagging importanza/affidabilità, editing testo inline
  - AI Vision estrae POI dalla planimetria
  - AI multi-pass con chunking estrae KBFact classificati
  - Recap con salute materiale + coverage POI + mix fonti + warning POI sottorappresentati
- **Step 2 Brief** completo e allineato spec/legacy: identità (obiettivo visitatore + cliente, tipo esperienza, promessa narrativa, target, percezione), mandato editoriale AI-generated, voce (tono + sensibilità + vincoli brand), griglia editoriale (must/nice/avoid/verify), criterio ammissibilità (inclusione/esclusione), policy fonti per task (schede/chatbot/zone/driver), visitor questions in 3 gruppi (pratiche/curiosità/approfondimento), family mode. Mappa delle tensioni.
- **Step 3 Luogo** planimetria-first: POI editabili sulla planimetria, zone narrative AI-generated (3 funzioni spec), georeferenziazione GPS opzionale tramite wizard "2 ancore"
- Persistenza IndexedDB + localStorage

## Prossimi passi

1. **Step 4 Driver e Personas** — lenti editoriali
2. **Step 5 Percorsi e Narratori** — sequenze ordinate + voci TTS
3. **Step 6 Schede** — POI × narratore con TTS + missioni Family Mode
4. **Step 7 Design e Immagini** — logo, hero, foto POI, cover itinerari tematici
5. **Step 8 Pubblica** — checklist + preview locale web app visitatore
6. **Chatbot runtime** minimo su KBFact affidabilità alta

Vedi `docs/spec/02-flusso-inserimento-dati.md` per la logica completa.
