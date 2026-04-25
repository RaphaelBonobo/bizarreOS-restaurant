import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseInvoicePDF, ParsedInvoice } from '../lib/invoice-parser.js';
import { prisma } from '../lib/prisma.js';

const VALID_ALLERGENES = ['GLUTEN','CRUSTACES','OEUFS','POISSONS','ARACHIDES','SOJA','LAIT','FRUIT_A_COQUE','CELERI','MOUTARDE','SESAME','SULFITES','LUPIN','MOLLUSQUES'];

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/invoice-parser/parse — upload PDF → retourne prévisualisation
router.post('/parse', upload.single('pdf'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier PDF fourni' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY non configurée' });
  }

  try {
    const parsed = await parseInvoicePDF(req.file.buffer);
    res.json(parsed);
  } catch (error: any) {
    console.error('Erreur parsing facture:', error.message);
    res.status(500).json({ error: error.message ?? 'Erreur lors de l\'analyse de la facture' });
  }
});

// POST /api/invoice-parser/confirm — crée la réception + les ingrédients
router.post('/confirm', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const data: ParsedInvoice & { fournisseurIds?: string[] } = req.body;

  try {
    // Trouver ou créer le fournisseur si on a un nom
    let fournisseurIds = data.fournisseurIds ?? [];

    if (fournisseurIds.length === 0 && data.fournisseurNom) {
      const existing = await prisma.fournisseur.findFirst({
        where: { tenantId, nom: { contains: data.fournisseurNom, mode: 'insensitive' } },
      });
      if (existing) {
        fournisseurIds = [existing.id];
      }
    }

    const reception = await prisma.receptionFacture.create({
      data: {
        numeroPiece: data.numeroPiece ?? undefined,
        dateAchat: data.dateAchat ? new Date(data.dateAchat) : undefined,
        notes: data.notes ?? undefined,
        tenantId,
        fournisseurs: fournisseurIds.length
          ? { connect: fournisseurIds.map((id) => ({ id })) }
          : undefined,
        ingredients: {
          create: (data.ingredients ?? []).map((ing) => ({
            nom: ing.nom,
            stockReception: ing.stockReception ?? undefined,
            unite: (ing.unite as any) ?? undefined,
            prixTotal: ing.prixTotal ?? undefined,
            bio: ing.bio ?? false,
            origine: ing.origine ?? undefined,
            allergenes: JSON.stringify((ing.allergenes ?? []).filter((a: string) => VALID_ALLERGENES.includes(a))),
            tenant: { connect: { id: tenantId } },
          })),
        },
      },
      include: {
        fournisseurs: true,
        ingredients: true,
      },
    });

    res.status(201).json(reception);
  } catch (error: any) {
    console.error('Erreur confirmation facture:', error.message);
    res.status(500).json({ error: error.message ?? 'Erreur lors de la création de la réception' });
  }
});

export default router;
