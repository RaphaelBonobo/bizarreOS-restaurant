import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ParsedIngredient {
  nom: string;
  stockReception: number | null;
  unite: string | null;
  prixTotal: number | null;
  bio: boolean;
  origine: string | null;
  allergenes: string[];
}

export interface ParsedInvoice {
  numeroPiece: string | null;
  dateAchat: string | null;
  fournisseurNom: string | null;
  ingredients: ParsedIngredient[];
  notes: string | null;
}

const PROMPT = `Tu analyses une facture d'un restaurant associatif. Extrais les informations en JSON strict.

Format attendu :
{
  "numeroPiece": "numéro de facture ou null",
  "dateAchat": "YYYY-MM-DD ou null",
  "fournisseurNom": "nom du fournisseur ou null",
  "notes": "informations générales pertinentes ou null",
  "ingredients": [
    {
      "nom": "nom de l'ingrédient",
      "stockReception": 1.5 (quantité reçue en nombre décimal, ou null),
      "unite": "KG|G|L|CL|ML|PIECE|BOTTES|SACHET|BOUQUET ou null",
      "prixTotal": 12.50 (prix total ligne en euros, ou null),
      "bio": true/false,
      "origine": "pays/région ou null",
      "allergenes": [] (liste parmi: GLUTEN, CRUSTACES, OEUFS, POISSONS, ARACHIDES, SOJA, LAIT, FRUIT_A_COQUE, CELERI, MOUTARDE, SESAME, SULFITES, LUPIN, MOLLUSQUES)
    }
  ]
}

Règles :
- Convertis les unités en celles de la liste (ex: "litre" → "L", "gramme" → "G", "kg" → "KG")
- Si une unité ne correspond à aucune de la liste, mets null
- Pour les prix, extrais le prix total de la ligne (quantité × prix unitaire)
- Détecte les mentions "bio", "AB", "Agriculture Biologique"
- Si tu ne peux pas extraire une valeur, mets null
- Réponds UNIQUEMENT avec le JSON, sans markdown ni texte autour`;

export async function parseInvoicePDF(pdfBuffer: Buffer): Promise<ParsedInvoice> {
  const base64 = pdfBuffer.toString('base64');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          } as any,
          {
            type: 'text',
            text: PROMPT,
          },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === 'text')?.text ?? '';

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as ParsedInvoice;
  } catch {
    throw new Error(`Réponse Claude non parseable : ${text.slice(0, 200)}`);
  }
}
