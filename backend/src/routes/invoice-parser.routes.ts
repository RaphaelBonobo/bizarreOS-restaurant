import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseInvoicePDF, ParsedInvoice } from '../lib/invoice-parser.js';
import { db } from '../lib/db.js';
import { fournisseurs, receptionFactures, receptionFournisseurs, ingredients, attachments, receptionAttachments, appSettings } from '../db/schema.js';
import { and, eq, like } from 'drizzle-orm';
import { uploadFile, extractKeyFromUrl, getSignedFileUrl } from '../lib/storage.js';

function getAnthropicKey(tenantId: string): string | null {
  const row = db.query.appSettings.findFirst({
    where: and(eq(appSettings.tenantId, tenantId), eq(appSettings.key, 'ANTHROPIC_API_KEY')),
  });
  return row?.value || process.env.ANTHROPIC_API_KEY || null;
}

const VALID_ALLERGENES = ['GLUTEN','CRUSTACES','OEUFS','POISSONS','ARACHIDES','SOJA','LAIT','FRUIT_A_COQUE','CELERI','MOUTARDE','SESAME','SULFITES','LUPIN','MOLLUSQUES'];

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /parse — upload PDF → stockage S3 + analyse → retourne { attachmentId, ...parsed }
router.post('/parse', upload.single('pdf'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier PDF fourni' });

  const tenantId = req.user!.tenantId;
  const apiKey = getAnthropicKey(tenantId);
  if (!apiKey) return res.status(503).json({ error: 'Clé Anthropic non configurée — rendez-vous dans Paramètres > Intégrations' });

  // Upload S3 optionnel — l'analyse Claude fonctionne même sans stockage configuré
  let attachmentId: string | undefined;
  try {
    const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, tenantId);
    const attachment = db.insert(attachments)
      .values({ url: uploaded.url, filename: uploaded.filename, mimeType: uploaded.mimeType, size: uploaded.size, tenantId })
      .returning()
      .get();
    attachmentId = attachment.id;
  } catch (e: any) {
    console.warn('Stockage S3 indisponible, analyse sans sauvegarde du fichier:', e.message);
  }

  try {
    const parsed = await parseInvoicePDF(req.file.buffer, apiKey);
    res.json({ attachmentId, ...parsed });
  } catch (e: any) {
    console.error('Erreur parsing facture:', e.message);
    res.status(500).json({ error: e.message ?? 'Erreur lors de l\'analyse de la facture' });
  }
});

// POST /confirm — crée la réception + les ingrédients + lie la pièce jointe
router.post('/confirm', (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { attachmentId, fournisseurIds: rawFournisseurIds, ...data }: ParsedInvoice & { attachmentId?: string; fournisseurIds?: string[] } = req.body;

  try {
    let fournisseurIds = rawFournisseurIds ?? [];

    if (fournisseurIds.length === 0 && data.fournisseurNom) {
      const existing = db.query.fournisseurs.findFirst({
        where: and(eq(fournisseurs.tenantId, tenantId), like(fournisseurs.nom, `%${data.fournisseurNom}%`)),
        columns: { id: true },
      });
      if (existing) {
        fournisseurIds = [existing.id];
      } else {
        // Fournisseur inconnu → création automatique avec les données de la facture
        const nouveau = db.insert(fournisseurs)
          .values({ nom: data.fournisseurNom, tenantId })
          .returning({ id: fournisseurs.id })
          .get();
        fournisseurIds = [nouveau.id];
      }
    }

    const reception = db.insert(receptionFactures)
      .values({
        numeroPiece: data.numeroPiece ?? null,
        dateAchat:   data.dateAchat ? new Date(data.dateAchat) : null,
        notes:       data.notes ?? null,
        tenantId,
      })
      .returning()
      .get();

    if (fournisseurIds.length) {
      db.insert(receptionFournisseurs)
        .values(fournisseurIds.map((fId) => ({ receptionId: reception.id, fournisseurId: fId })))
        .run();
    }

    if (data.ingredients?.length) {
      db.insert(ingredients)
        .values(data.ingredients.map((ing) => ({
          nom:            ing.nom,
          stockReception: ing.stockReception ?? null,
          unite:          ing.unite ?? null,
          prixTotal:      ing.prixTotal ?? null,
          bio:            ing.bio ?? false,
          origine:        ing.origine ?? null,
          allergenes:     JSON.stringify((ing.allergenes ?? []).filter((a: string) => VALID_ALLERGENES.includes(a))),
          lotId:          reception.id,
          tenantId,
        })))
        .run();
    }

    // Lier la pièce jointe à la réception si elle existe
    if (attachmentId) {
      db.insert(receptionAttachments)
        .values({ receptionId: reception.id, attachmentId, tenantId })
        .onConflictDoNothing()
        .run();
    }

    const full = db.query.receptionFactures.findFirst({
      where: eq(receptionFactures.id, reception.id),
      with: {
        receptionFournisseurs: { with: { fournisseur: true } },
        ingredients: true,
        receptionAttachments: { with: { attachment: true } },
      },
    });

    res.status(201).json({
      ...full,
      fournisseurs:  full?.receptionFournisseurs.map((x) => x.fournisseur) ?? [],
      attachments:   full?.receptionAttachments.map((x) => x.attachment) ?? [],
    });
  } catch (e: any) {
    console.error('Erreur confirmation facture:', e.message);
    res.status(500).json({ error: e.message ?? 'Erreur lors de la création de la réception' });
  }
});

// GET /invoice-parser/attachment/:id/signed-url — URL signée pour visualiser une facture
router.get('/attachment/:id/signed-url', async (req: Request, res: Response) => {
  try {
    const attachment = db.query.attachments.findFirst({ where: eq(attachments.id, req.params.id) });
    if (!attachment) return res.status(404).json({ error: 'Pièce jointe introuvable' });
    if (attachment.tenantId !== req.user!.tenantId) return res.status(403).json({ error: 'Accès refusé' });

    const signedUrl = await getSignedFileUrl(extractKeyFromUrl(attachment.url), attachment.tenantId);
    res.json({ url: signedUrl });
  } catch (e: any) {
    res.status(500).json({ error: 'Erreur lors de la génération de l\'URL signée' });
  }
});

export default router;
